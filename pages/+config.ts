import vikeReact from "vike-react/config";
import type { Config } from "vike/types";
import Layout from "../layouts/LayoutDefault.js";

// Default config (can be overridden by pages)
// https://vike.dev/config

export default {
  // https://vike.dev/Layout
  Layout,
  // https://vike.dev/head-tags
  title: "Theo Zourzouvillys",
  description: "Personal Website of Theo Zourzouvillys",
  extends: vikeReact,
  prerender: true,
} satisfies Config;
