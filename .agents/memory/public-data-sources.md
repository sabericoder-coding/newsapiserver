---
name: Public data sources
description: Durable guidance for public country and news APIs used by mobile clients.
---

Public country and news sources should be accessed through the app server rather than directly from the mobile client. Validate the upstream payload before mapping it into the app's stable API contract, and keep a clear error response for upstream failures.

**Why:** Public API versions can be deprecated or return a successful HTTP response containing an error object, which otherwise becomes a confusing client-side failure. Browser previews also enforce cross-origin rules that native clients may not.

**How to apply:** When changing country or news providers, update the server proxy and OpenAPI contract first, regenerate typed clients, then keep the mobile screen dependent only on the stable app response shape.