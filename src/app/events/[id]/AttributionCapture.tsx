"use client";

import { useEffect } from "react";

export default function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource   = params.get("utm_source")   ?? "";
    const utmMedium   = params.get("utm_medium")   ?? "";
    const utmCampaign = params.get("utm_campaign") ?? "";
    const utmContent  = params.get("utm_content")  ?? "";
    const utmTerm     = params.get("utm_term")     ?? "";
    const campaignId  = params.get("campaign_id")  ?? "";
    const adsetId     = params.get("adset_id")     ?? "";
    const adId        = params.get("ad_id")        ?? "";
    const placement   = params.get("placement")    ?? "";
    const fbclid      = params.get("fbclid")       ?? "";

    const hasUtm = [utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
                    campaignId, adsetId, adId, placement, fbclid].some(Boolean);

    if (!hasUtm) return;

    try {
      localStorage.setItem("mc_attribution", JSON.stringify({
        utm_source:   utmSource,
        utm_medium:   utmMedium,
        utm_campaign: utmCampaign,
        utm_content:  utmContent,
        utm_term:     utmTerm,
        campaign_id:  campaignId,
        adset_id:     adsetId,
        ad_id:        adId,
        placement,
        fbclid,
        landing_page: window.location.href,
        referrer:     document.referrer,
      }));
    } catch {
      // localStorage unavailable — silently skip
    }
  }, []);

  return null;
}
