import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation";
import { TrackingProvider } from "./context/TrackingContext";
import { TimeTrackerProvider } from "./context/TimeTrackerContext";
import TimeTrackerBar from "./time-tracking/TimeTrackerBar";

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
            <Navigation /> 
            <main>
              <TimeTrackerBar />
              <section>
              {children}
              </section>
            </main>
          </TimeTrackerProvider>
        </TrackingProvider>
      </body>
    </html>
  );
}