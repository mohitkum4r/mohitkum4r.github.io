---
layout: post
title: "A Safe 3-Step Migration Strategy from EC2 to Amazon EKS"
date: 2026-05-11
description: "A practical guide to migrating workloads from EC2 to Amazon EKS using a phased approach to minimize risk and downtime."
---

Most companies running workloads on EC2 eventually hit the same problems:

- Difficult scaling
- Slow deployments
- Infrastructure drift
- Manual operations
- Poor service standardization

Moving to Amazon EKS solves many of these issues, but doing a direct migration is risky.

The safest approach is a phased migration where:
1. Applications move first
2. Traffic moves later
3. Legacy infrastructure is removed last

This document explains a practical 3-step strategy used in real production environments.

---

# Phase 1 — Move Applications to Kubernetes Behind Existing EC2 NGINX Proxies

## Goal

Deploy applications to EKS while keeping the existing EC2 ingress layer unchanged.

Instead of exposing Kubernetes directly to the internet immediately, existing EC2 NGINX proxies continue handling incoming traffic.

```text
Client
   ↓
Load Balancer
   ↓
EC2 NGINX
   ↓
EKS Services
   ↓
Pods
```

This significantly reduces migration risk because:

* DNS remains unchanged
* Rollbacks are easy
* Existing traffic patterns stay stable
* WebSocket handling remains controlled

---

# What Should Be Done in This Phase

## 1. Containerize Applications

Applications should:

* Avoid local filesystem dependencies
* Externalize configuration
* Become stateless where possible

This is also a great opportunity to:

* Standardize Docker builds
* Introduce CI/CD pipelines
* Automate deployments

---

## 2. Simplify Configuration Management

Many legacy applications maintain:

* Multiple config files
* Environment-specific YAMLs
* Duplicate properties

A cleaner pattern is:

* Move toward a single `application.yaml`
* Keep shared config inside the application
* Move environment-specific properties to EKS environment variables

This follows better DRY principles and simplifies deployments.

---

## 3. Start Using Secure Secret Management

Migration is the right time to eliminate:

* Hardcoded credentials
* Secrets inside repositories
* Shared config passwords

Recommended approach:

* AWS Secrets Manager
* Kubernetes External Secrets
* IAM-based authentication

---

## 4. Adopt IAM Roles Properly

Instead of static AWS credentials inside applications:

* Use IAM Roles for Service Accounts (IRSA)
* Grant pod-level AWS permissions

This improves:

* Security
* Auditability
* Credential rotation

---

## 5. Move Inter-Service Communication to Kubernetes

Applications already migrated to EKS should communicate internally using Kubernetes DNS and services.

Instead of:

```text
service-a → EC2 IP → service-b
```

move to:

```text
service-a → kubernetes-service-name
```

This allows:

* Native service discovery
* Better scaling
* Reduced EC2 dependency

---

## 6. Use EC2 NGINX as a Reverse Proxy

NGINX routes traffic into Kubernetes while maintaining existing public endpoints.

Example:

```nginx
location /api/ {
    proxy_pass http://eks-ingress;
}

location /ws/ {
    proxy_pass http://eks-websocket;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

# Phase 2 — Route API and WebSocket Traffic Directly to EKS

Once workloads stabilize inside Kubernetes, traffic can gradually bypass EC2 proxies.

```text
Client
   ↓
AWS Load Balancer / Ingress
   ↓
EKS
   ↓
Pods
```

Traffic migration should always be gradual:

* 5%
* 25%
* 50%
* 100%

This phase validates:

* Kubernetes ingress
* Load balancing
* WebSocket stability
* Autoscaling behavior
* Production readiness

---

# Important Operational Practice

During this phase, NGINX access logs become extremely valuable.

Log:

* Endpoints being hit
* APIs still using EC2 paths
* WebSocket traffic
* Request frequencies

This helps identify:

* Forgotten consumers
* Legacy integrations
* Unmigrated services
* Unexpected traffic patterns

---

# Phase 3 — Decommission EC2 NGINX Proxies

Once traffic is consistently routed directly to EKS, EC2 proxies can be removed safely.

However, never shut them down immediately.

A safer strategy is:

1. Monitor traffic logs continuously
2. Verify no requests hit legacy endpoints
3. Observe for at least 7 days
4. Then stop EC2 proxy pods/instances

This observation window protects against:

* Delayed cron jobs
* Rare client flows
* Legacy integrations
* Weekend-only traffic patterns

---

# Final Architecture

```text
Client
   ↓
AWS Load Balancer
   ↓
EKS Ingress
   ↓
Kubernetes Services
   ↓
Pods
```

---

# Key Benefits After Migration

Organizations usually gain:

* Faster deployments
* Easier scaling
* Better resource utilization
* Improved resiliency
* Cleaner infrastructure management
* Better observability
* Stronger security practices

Most importantly, engineering teams gain a platform that scales operationally as the company grows.

---

# Final Thoughts

The biggest mistake companies make during EKS migration is trying to move everything at once.

A phased migration strategy reduces:

* Downtime risk
* Rollback complexity
* Networking failures
* Operational surprises

The safest sequence is always:

1. Move applications first
2. Move traffic second
3. Remove infrastructure last

That approach allows teams to modernize gradually while keeping production systems stable.
