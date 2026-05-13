---
layout: post
title: "Architecture Decision Record: Zero-Downtime EKS Migration Strategy"
date: 2026-05-11
description: "An architectural deep-dive into migrating high-throughput financial systems from EC2 to Amazon EKS without dropping transactions."
---

# Context & Problem Statement

Our legacy architecture consisted of monolithic Spring Boot applications deployed on raw EC2 instances. While functional, it lacked horizontal scalability, resulting in unpredictable deployment times and over-provisioned infrastructure during off-peak hours. A migration to Amazon Elastic Kubernetes Service (EKS) was necessary, but given our stringent SLAs for financial transactions, any cutover had to guarantee **zero downtime** and **zero dropped requests**.

# Phase 1: The Strangler Fig with EC2 NGINX Proxies

Instead of a 'big bang' DNS cutover, we opted for a phased approach. The existing EC2 NGINX layer was retained as the primary entry point. We deployed the containerized workloads to EKS and configured the legacy NGINX proxies to route traffic selectively to the EKS internal load balancers.

### Failure Mode Considerations
- **What happens if a pod crashes during cutover?** EKS Readiness Probes were strictly configured to ensure traffic only routed to healthy pods. If a pod crashed, the Kubernetes service immediately removed it from the endpoints list. The EC2 NGINX proxy was configured with a retry mechanism (`proxy_next_upstream error timeout http_502;`) to seamlessly forward the request to another healthy pod.

# Phase 2: ALB Ingress Controller vs. Legacy NGINX

Once application stability was proven, we needed to route traffic directly to EKS. We evaluated using the AWS Load Balancer (ALB) Ingress Controller against migrating NGINX into the cluster as an Ingress Controller.

**Decision:** We adopted the **AWS ALB Ingress Controller**. 
*Rationale:* It offloaded TLS termination and WAF integrations directly to the managed AWS layer, reducing pod resource consumption. It also seamlessly integrated with AWS Certificate Manager (ACM) and Route53.

```yaml
# Ingress configuration mapping ALB to EKS Services
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fin-api-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /actuator/health
spec:
  rules:
    - http:
        paths:
          - path: /api/v1/*
            pathType: Prefix
            backend:
              service:
                name: transaction-service
                port:
                  number: 8080
```

# Phase 3: Handling Connection Draining

The most critical challenge was handling in-flight database transactions during pod termination (e.g., during a rolling deployment). Hard-killing a pod would leave uncommitted transactions in an ambiguous state.

We implemented a robust connection draining strategy using Kubernetes Lifecycle Hooks.

1. **PreStop Hook:** We introduced a `preStop` hook that pauses termination for 30 seconds.
2. **Spring Boot Graceful Shutdown:** We enabled Spring Boot's graceful shutdown feature.

```yaml
# Pod Lifecycle Hook
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 30"]
```

```yaml
# application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

### The Shutdown Flow
When EKS initiates a pod termination, it first removes the pod from the Service endpoints. The `preStop` hook forces the pod to wait, ensuring the ALB Ingress Controller has time to deregister the target and stop sending new requests. Concurrently, Spring Boot stops accepting new connections but allows existing active database transactions to commit or rollback cleanly within the 30-second window.

# Conclusion

By isolating the migration into application deployment, traffic routing, and legacy decommissioning phases, we successfully migrated our transaction tier to EKS without a single dropped client request. The combination of ALB Ingress Controllers and robust pod lifecycle management forms the foundation of our current resilient architecture.
