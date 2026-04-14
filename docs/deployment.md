# Deployment

This guide covers building the Docker image and deploying chat-app to Kubernetes with Traefik ingress.

## Overview

```
User → Traefik (path: /chat-app) → Service (port 80) → Pod (port 3000)
```

The app is built with `basePath=/chat-app` baked into the bundle. Traefik routes the full path through — **no strip-prefix middleware is used**.

---

## 1. Build the Docker image

`BASE_PATH` must be passed at build time so Next.js bakes it into the bundle.

```bash
docker build \
  --build-arg BASE_PATH=/chat-app \
  -t your-registry/chat-app:1.0.0 \
  .
```

Push to your registry:

```bash
docker push your-registry/chat-app:1.0.0
```

> **Local test before pushing:**
> ```bash
> docker run -p 3000:3000 \
>   -e AI_PROVIDER=openai \
>   -e AI_API_KEY=sk-... \
>   your-registry/chat-app:1.0.0
> # open http://localhost:3000/chat-app
> ```

---

## 2. Prepare Kubernetes resources

### Update the image reference

Edit `k8s/deployment.yaml` and replace the placeholder image:

```yaml
# Before
image: your-registry/chat-app:latest

# After
image: your-registry/chat-app:1.0.0
```

### Create the API key Secret

Never commit real secrets. Create the Secret directly with `kubectl`:

```bash
kubectl create secret generic chat-app-secrets \
  --namespace default \
  --from-literal=ai-api-key=YOUR_API_KEY
```

For Ollama (no API key needed), create an empty secret:

```bash
kubectl create secret generic chat-app-secrets \
  --namespace default \
  --from-literal=ai-api-key=""
```

### Update the ConfigMap

Edit `k8s/configmap.yaml` with your provider settings:

```yaml
data:
  AI_PROVIDER: "openai"          # or anthropic, ollama, openrouter, custom
  AI_MODEL: "gpt-4o-mini"
  AI_BASE_URL: ""                # required for ollama/openrouter/custom
```

See [`docs/providers.md`](providers.md) for provider-specific values.

---

## 3. Choose your Ingress option

`k8s/ingress.yaml` contains two options. Pick one and delete (or comment out) the other.

### Option A — Traefik IngressRoute CRD (recommended)

Requires Traefik v2+ with CRDs installed in the cluster.

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: chat-app
  namespace: default
spec:
  entryPoints:
    - web          # change to "websecure" for TLS
  routes:
    - match: PathPrefix(`/chat-app`)
      kind: Rule
      services:
        - name: chat-app
          port: 80
```

For HTTPS with automatic TLS via cert-manager:

```yaml
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`your-domain.com`) && PathPrefix(`/chat-app`)
      kind: Rule
      services:
        - name: chat-app
          port: 80
  tls:
    certResolver: letsencrypt
```

### Option B — Standard Kubernetes Ingress

Use this if Traefik CRDs are not available.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chat-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: traefik
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - http:
        paths:
          - path: /chat-app
            pathType: Prefix
            backend:
              service:
                name: chat-app
                port:
                  number: 80
```

---

## 4. Apply all manifests

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml   # or ingressroute.yaml
```

Or apply the whole directory at once (after confirming `secret.yaml` is not committed with real values):

```bash
kubectl apply -f k8s/
```

---

## 5. Verify the deployment

```bash
# Check pods are running
kubectl get pods -l app=chat-app

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# chat-app-7d9f8b6c9-abc12    1/1     Running   0          30s
# chat-app-7d9f8b6c9-def34    1/1     Running   0          30s

# Check the service
kubectl get svc chat-app

# Check ingress
kubectl get ingressroute chat-app    # for Traefik CRD
kubectl get ingress chat-app         # for standard Ingress

# View pod logs
kubectl logs -l app=chat-app --tail=50

# Test the health endpoint (from inside the cluster)
kubectl run tmp --image=curlimages/curl --restart=Never --rm -it -- \
  curl http://chat-app/chat-app/api/health
```

From outside the cluster via Traefik:

```bash
curl https://your-domain.com/chat-app/api/health
# {"status":"ok","timestamp":"..."}
```

---

## 6. Rolling updates

Build and push a new image:

```bash
docker build --build-arg BASE_PATH=/chat-app -t your-registry/chat-app:1.1.0 .
docker push your-registry/chat-app:1.1.0
```

Update the deployment:

```bash
kubectl set image deployment/chat-app \
  chat-app=your-registry/chat-app:1.1.0

# Monitor the rollout
kubectl rollout status deployment/chat-app
```

Roll back if needed:

```bash
kubectl rollout undo deployment/chat-app
```

---

## 7. Scaling

```bash
# Manual scale
kubectl scale deployment chat-app --replicas=4

# Horizontal pod autoscaler (CPU-based)
kubectl autoscale deployment chat-app \
  --min=2 --max=10 --cpu-percent=70
```

---

## Resource requirements

The defaults in `k8s/deployment.yaml` are conservative starting points:

| | CPU | Memory |
|---|---|---|
| **Requests** | 100m | 256Mi |
| **Limits** | 500m | 512Mi |

Adjust based on your traffic. The Next.js standalone server is relatively lightweight at idle (~50–80 MB RSS).

---

## Namespace

All manifests default to `namespace: default`. To deploy to a different namespace:

```bash
kubectl create namespace chat
kubectl apply -f k8s/ -n chat
```

Or update the `namespace:` field in each manifest.

---

## Image pull secrets

If your registry is private:

```bash
kubectl create secret docker-registry registry-creds \
  --docker-server=your-registry \
  --docker-username=user \
  --docker-password=password

kubectl patch serviceaccount default \
  -p '{"imagePullSecrets":[{"name":"registry-creds"}]}'
```

Or add `imagePullSecrets` directly to the Deployment pod spec.
