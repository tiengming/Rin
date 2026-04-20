import type { ReactNode } from "react";
import { Helmet } from "react-helmet";
import type { ConfigWrapper } from "@rin/config";
import type { Profile } from "../state/profile";
import { ClientConfigContext } from "../state/config";
import { ProfileContext } from "../state/profile";

export function AppProviders({
  children,
  config,
  profile,
}: {
  children: ReactNode;
  config: ConfigWrapper;
  profile: Profile | undefined | null;
}) {
  const googleVerification = config.get<string>("site.google_verification");
  const microsoftVerification = config.get<string>("site.microsoft_verification");
  const googleAnalyticsId = config.get<string>("site.google_analytics_id");
  const microsoftClarityId = config.get<string>("site.microsoft_clarity_id");

  const siteName = config.get<string>("site.name") || "Rin";
  const siteDescription = config.get<string>("site.description") || "";
  const siteAvatar = config.get<string>("site.avatar");

  return (
    <ClientConfigContext.Provider value={config}>
      <ProfileContext.Provider value={profile}>
        <Helmet>
          <link rel="icon" href="/favicon" />

          {/* SEO Metadata */}
          <title>{siteName}</title>
          <meta name="description" content={siteDescription} />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href={window.location.origin} />

          <meta property="og:site_name" content={siteName} />
          <meta property="og:title" content={siteName} />
          <meta property="og:description" content={siteDescription} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={window.location.origin} />
          {siteAvatar && <meta property="og:image" content={siteAvatar} />}

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={siteName} />
          <meta name="twitter:description" content={siteDescription} />
          {siteAvatar && <meta name="twitter:image" content={siteAvatar} />}

          {/* Site Verification */}
          {googleVerification && (
            <meta name="google-site-verification" content={googleVerification} />
          )}
          {microsoftVerification && (
            <meta name="msvalidate.01" content={microsoftVerification} />
          )}

          {/* Analytics Scripts */}
          {googleAnalyticsId && (
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
          )}
          {googleAnalyticsId && (
            <script>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </script>
          )}
          {microsoftClarityId && (
            <script>
              {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${microsoftClarityId}");
              `}
            </script>
          )}
        </Helmet>
        {children}
      </ProfileContext.Provider>
    </ClientConfigContext.Provider>
  );
}
