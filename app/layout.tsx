import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation";
import { TrackingProvider } from "./context/TrackingContext";
import { TimeTrackerProvider } from "./context/TimeTrackerContext";
import { TimeEntriesProvider } from "./context/TimeEntriesContext";
import TimeTrackerWrapper from "./time-tracking/TimeTrackerWrapper";

export const metadata: Metadata = {
  title: "Design Elixir Tools",
  description: "Tools I needed but couldn't find",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <link rel="stylesheet" href="https://use.typekit.net/gek3qlq.css"></link>
      </head>
      <body className="flex-start-start">
        <TrackingProvider>
          <TimeTrackerProvider>
            <TimeEntriesProvider>
              <Navigation /> 
              <main>
                <TimeTrackerWrapper />
                <section>
                {children}
                </section>
              </main>
            </TimeEntriesProvider>
          </TimeTrackerProvider>
        </TrackingProvider>
      </body>
    </html>
  );
}