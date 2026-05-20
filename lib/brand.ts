// Brand config: swap product name / tagline / contact in one place.
export const brand = {
  name: "Soultech Management",
  shortName: "Soultech",
  tagline: "An AI that learns how you learn",
  contactEmail: "hello@soultech.ai", // TODO: replace with real contact
  logo: {
    src: "/logo.png",
    // Original logo is navy + teal on transparent. On the dark theme we
    // render it as pure white via CSS filter. Drop a white-on-transparent
    // version at /public/logo-dark.png and swap if you want the teal back.
    width: 350,
    height: 126,
    alt: "Soultech Management",
  },
  year: new Date().getFullYear(),
};
