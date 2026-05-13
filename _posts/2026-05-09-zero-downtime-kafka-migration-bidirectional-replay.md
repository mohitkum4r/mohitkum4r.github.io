---
layout: post
title: "Zero-Downtime Kafka Migration: Bidirectional Replay Strategy"
date: 2026-05-09
description: "A detailed post-mortem on our zero-downtime migration from AWS MSK to Confluent Cloud using dual-writes and bidirectional replication."
---

# The Challenge

Our financial transaction pipelines heavily rely on Apache Kafka for event-driven coordination. We needed to migrate our entire streaming infrastructure from AWS Managed Streaming for Apache Kafka (MSK) to Confluent Cloud. 

The mandate: **Zero downtime, zero message loss, and no interruption to downstream consumers.**

# The Dual-Write Architecture

A simple 'cut-and-run' migration was impossible due to the sheer volume of in-flight transactions. We employed a phased dual-write and bidirectional replay strategy.

### Phase 1: Dual-Write Setup
We modified all our producer microservices to write identical payloads to *both* the legacy AWS MSK cluster and the new Confluent Cloud cluster. This ensured that any new events were immediately available in the new environment.

### Phase 2: Bidirectional Replication (MirrorMaker 2)
To handle the historical data and stateful consumers that hadn't yet been migrated, we deployed Kafka MirrorMaker 2. 

We configured a bidirectional replication topology:
- **MSK -> Confluent:** Catching up historical data and ensuring consumers on Confluent had the full state.
- **Confluent -> MSK:** Ensuring that events generated natively on the new cluster were accessible to legacy consumers still pointing to MSK.

# Handling Consumer Migration

With both clusters synchronized, we could migrate consumers independently.

1. **Offset Translation:** The most complex part was offset translation. Because partition offsets are not guaranteed to be identical across clusters, we used MirrorMaker's offset translation feature to map MSK consumer group offsets to their corresponding Confluent offsets.
2. **Rolling Restarts:** We performed rolling restarts of consumer groups, updating their configurations to point to the Confluent Cloud brokers and resume from the translated offsets.

### Handling Duplicates
Because of the dual-write and replication overlap, there was a risk of duplicate message processing. We relied on the idempotency implemented in our consumer services. Every transaction event carried a unique idempotency key, ensuring that if a message was processed from MSK and then re-processed from Confluent, the database state remained consistent.

# The Cutover

Once all producers and consumers were validated on Confluent Cloud, we disabled the MSK dual-writes, spun down MirrorMaker 2, and decommissioned the AWS MSK cluster. The migration took three weeks of careful execution, but we achieved our goal of an invisible transition for our users.
