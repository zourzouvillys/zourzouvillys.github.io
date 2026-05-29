---
title: "Understanding Navionics Accuracy and Limitations in Marine Navigation"
description: "Why \"Navionics is inaccurate\" usually isn't the app or the charts — it's your GPS source. Reading chart data quality (ZOC) and getting reliable positioning in the Inside Passage."
date: 2024-12-12
tags: [sailing, navigation, inside-passage]
draft: false
---

> Note: this is specific to the Inside Passage, not other parts of the world that use private survey data from different companies or rely on very old public-domain or raster-based data.

There’s a lot of statements thrown around like “Navionics is inaccurate” or “there was an uncharted rock at Y.” But here’s the thing: Navionics and most other modern charting apps are as accurate as the data and positioning sources feeding them. If you’re seeing inaccuracies, chances are it’s not the app, and probably also not the charting data in the Inside Passage (except in a few scenarios that you can know in advance) — it’s the GPS source you’re using.

Modern hydrography has come a long way, especially with the shift to vector charts and embedded Data Quality indicators like Zones of Confidence (ZOC). These indicators help you understand the reliability of chart data, from soundings to positioning and seafloor feature detection. Let’s break this down and talk about how to make sure your navigation setup is working as accurately as it can.

## Understanding Chart Data and ZOC

Hydrographers have been at this for centuries, and luckily, they’ve done a lot of the hard thinking for us. With vector charts, Data Quality information is baked right into the ENC data through the ZOC system. This classification gives you a snapshot of how reliable the survey data is:

- **Position Accuracy:** How closely a feature’s location matches the chart’s datum, often ±5m plus 5% of depth for the top category (A1). I’ve attached a reference for the different ZOC categories, but you can easily find it online and it is probably in NOAA Chart 1 (I’m in a hotel in Montana far from the boat, so can’t check).
- **Sounding Accuracy:** The reliability of depth measurements, such as being accurate within 0.6m up to 10m depth.
- **Survey Coverage:** Whether significant seafloor features were detected during the survey.

Checking out ZOC data isn’t hard. Professional ENC viewers usually have an option to display it, but for recreational users, NOAA’s ENC Viewer is your best bet. Just turn on the “Data Quality” layer, and you’ll see the ZOC classification for the area. For example, Myers Chuck, which has a six-star ZOC rating (A1), meaning it’s about as reliable as it gets.

![Reference table of CATZOC / Zones of Confidence categories and their position and sounding accuracies](/images/navionics-zoc-categories.webp)

However, lots of areas of the Inside Passage have 5 star (A2) or 4 star (B) ratings. You can navigate with confidence in A2 ZOC areas, but B is a little less reliable. “Uncharted features, hazardous to surface navigation are not expected but may exist.” Additionally, B soundings are +/- 1.2m at 10m depths, and positions can be up to 50m off. For example, El Capitan Passage off Prince of Wales is ZOC B.

Whale Bay on the south-west of Baranof Island, on the other hand, is only 3 stars — ZOC C — “Depth anomalies may be expected; low accuracy survey or passage soundings.”

Felice Strait was partially surveyed in 2023, and more was planned in 2024. However, parts are still 2 star (ZOC D) which is … awful, and dates back to survey data from the 1880s and 1920s.

If you’re curious, the UK Hydrographic Office’s CATZOC guide lays out more details.

## Chart Updates

As new surveys are undertaken, lights or buoys are moved or modified, channels and sandbanks change, etc., ENC data is updated by NOAA/CHS. Chart subscriptions are normally needed to get these updates. I sometimes hear people mention that it’s a waste of money; that is for you to decide. But, even outside of the changes to lights, buoys, and other navigational hazards which are not static for decades (sunk fishing boats?), NOAA surveyed 265 square miles of Alaska in 2023 (mostly the aforementioned Felice Strait and South-East corner of Prince of Wales), and NOAA’s 2024 funding covered hydrography for Approaches to Revillagigedo, which were previously a mix of ZOC B, C, and D in some areas.

## Charting Apps and Data Sources

At least through the Inside Passage, Navionics (now “Garmin Boating”) pulls its base data from authoritative sources like NOAA for the U.S. and CHS for Canada. If your subscription is current and your charts are up to date, the data should align perfectly with official sources. Over the summer, I compared Navionics, TZ Vector, Garmin GPSMAP, and NOAA ENCs extensively. In every case, content matched up exactly.

Features like SonarChart or ActiveCaptain — which rely on community-generated or statistical modeling data — can be great for fishing or diving but aren’t designed for navigation. Treat those as bonus layers, not as replacements for the official chart data. I use SonarChart a lot for fun (“fishing”) and ActiveCaptain is amusing at the very least, but never used for navigation.

So: have you ever seen discrepancies between up-to-date Navionics charts and official ENC data? If so, I’d love to hear about them.

## Positioning Accuracy and GNSS Limitations

Here’s where things often go wrong: knowing your exact position relative to the chart is just as critical as the data itself. GNSS (commonly GPS) technology is reliable, but if you’re using a smartphone or tablet, the quality of the position data can vary — a lot. And this is key to understand.

When using Navionics on a smartphone or tablet, unless you have specifically set up something else, your position comes from the device’s built-in location services, which combine GNSS/GPS with Wi-Fi and cell tower triangulation where available. This can lead to significant inaccuracies on a boat. For example:

- **Low Battery Mode:** Can throttle GPS performance.
- **App Backgrounding:** Switching out of the app may delay location updates.
- **Cell Service Influence:** In areas with cell coverage, the device might estimate your position using rough methods before locking onto GNSS, sometimes placing you hundreds of meters off.

You can check location accuracy in apps like Google Maps by looking at the blue circle around your position. Navionics likely waits for better accuracy before displaying your location, but you’re always at the mercy of your phone or tablet’s quirks. I’ve worked on multiple iOS apps which have experienced very weird location behavior in specific iOS releases by Apple.

For navigation, I rely on two high-quality GNSS receivers integrated into my NMEA network. These provide accuracy metrics like Dilution of Precision (DOP), which trigger alarms for degraded signals on my plotters so I can trust the location my navigation devices think they are is correct. And, importantly, they are always online and not subject to Apple or Google’s battery/power-saving algorithms and bugs.

The NMEA network is connected to an IP gateway, making it accessible for apps like Navionics or TZ to use rather than my phone and tablet location systems. As a bonus, you get heading, depth, and AIS all available in Navionics, TZ, etc.

So — if you’re not using an external GPS source, you’re rolling the dice with accuracy, and rather than saying Navionics is inaccurate from a positioning point of view, it would probably be safer to say that you don’t have reliable accurate positioning. :)

## Best Practices for Navigational Accuracy

1. **Understand chart data limitations:** Check the ZOC classification for the areas you’re navigating and know what to expect.
2. **Update charts regularly:** Keep your subscriptions current and download updates before setting out. They don’t change that regularly in the Inside Passage vs. other locations which have more transient features, but NOAA and CHS absolutely update charts.
3. **Use accurate positioning sources:** Don’t rely on smartphone or tablet GPS. Use dedicated GNSS receivers integrated with an NMEA network, and use that as your position source.
4. **Monitor accuracy indicators:** Watch for real-time metrics like DOP values and set alarms for degraded accuracy.

If you’ve ever thought Navionics wasn’t accurate in the Inside Passage, chances are it wasn’t the charts being wrong, but the quality of the underlying official data or the GPS source you were using. Navigation is as much about understanding your tools as it is about using them effectively, and modern technology is a lot more accurate and powerful, but there is a lot more to understand. Have you had specific experiences where positioning or navigational systems let you down? Let’s trade notes and figure out how we can navigate smarter and safer.
