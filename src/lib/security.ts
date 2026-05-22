const IPV4_FALLBACK = "127.0.0.1";

export function getRequestIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || IPV4_FALLBACK;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return IPV4_FALLBACK;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const candidates = new Set<string>();
    const requestUrl = new URL(request.url);
    if (requestUrl.host) {
      candidates.add(requestUrl.host);
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const first = forwardedHost.split(",")[0]?.trim();
      if (first) {
        candidates.add(first);
      }
    }

    const host = request.headers.get("host");
    if (host) {
      candidates.add(host.trim());
    }

    const sitePublicUrl = process.env.SITE_PUBLIC_URL;
    if (sitePublicUrl) {
      try {
        candidates.add(new URL(sitePublicUrl).host);
      } catch {
        // ignore invalid SITE_PUBLIC_URL here
      }
    }

    if (candidates.has(originUrl.host)) {
      return true;
    }

    const fetchSite = request.headers.get("sec-fetch-site");
    if (
      fetchSite === "same-origin" ||
      fetchSite === "same-site" ||
      fetchSite === "none"
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function shouldUseSecureCookies(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    const proto = forwardedProto.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") {
      return true;
    }
    if (proto === "http") {
      return false;
    }
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
