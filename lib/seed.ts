// 2027 seed list for the event tech / business of events vertical.
// start/end are YYYY-MM-DD. note flags anything not yet confirmed by the organizer.
export const SEED_EVENTS: {
  slug: string;
  name: string;
  start: string | null;
  end: string | null;
  city: string;
  url: string;
  note?: string;
}[] = [
  { slug: "pcma-convening-leaders-2027", name: "PCMA Convening Leaders", start: "2027-01-10", end: "2027-01-13", city: "Miami Beach", url: "https://conveningleaders.org/" },
  { slug: "exhibitorlive-2027", name: "ExhibitorLIVE", start: "2027-02-14", end: "2027-02-18", city: "Denver", url: "https://www.exhibitorlive.com/" },
  { slug: "mpi-emec-2027", name: "MPI EMEC", start: "2027-02-20", end: "2027-02-23", city: "Galway", url: "https://www.mpi.org/events/emec27" },
  { slug: "cvent-connect-2027", name: "Cvent CONNECT", start: "2027-04-05", end: "2027-04-08", city: "Denver", url: "https://www.cvent.com/" },
  { slug: "siso-ceo-summit-2027", name: "SISO CEO Summit", start: "2027-04-05", end: "2027-04-08", city: "Amelia Island, FL", url: "https://www.siso.org/" },
  { slug: "experiential-marketing-summit-2027", name: "Experiential Marketing Summit", start: "2027-04-27", end: "2027-04-29", city: "Las Vegas", url: "https://www.eventmarketer.com/event/experiential-marketing-summit-2027/" },
  { slug: "imex-frankfurt-2027", name: "IMEX Frankfurt", start: "2027-05-11", end: "2027-05-13", city: "Frankfurt", url: "https://frankfurt.imexevents.com/" },
  { slug: "the-meetings-show-2027", name: "The Meetings Show", start: "2027-06-23", end: "2027-06-24", city: "London", url: "https://www.themeetingsshow.com/", note: "Dates unconfirmed" },
  { slug: "mpi-wec-2027", name: "MPI WEC", start: "2027-06-28", end: "2027-06-30", city: "Las Vegas", url: "https://www.mpi.org/events/" },
  { slug: "asae-annual-2027", name: "ASAE Annual Meeting", start: "2027-08-07", end: "2027-08-10", city: "Charlotte", url: "https://annual.asaecenter.org/" },
  { slug: "imex-america-2027", name: "IMEX America", start: "2027-09-28", end: "2027-09-30", city: "Las Vegas", url: "https://america.imexevents.com/" },
  { slug: "ufi-global-congress-2027", name: "UFI Global Congress", start: "2027-11-03", end: "2027-11-06", city: "Guadalajara", url: "https://www.ufi.org/" },
  { slug: "event-tech-live-london-2027", name: "Event Tech Live London", start: "2027-11-10", end: "2027-11-11", city: "London", url: "https://eventtechlive.com/", note: "Dates unconfirmed" },
  { slug: "ibtm-world-2027", name: "IBTM World", start: null, end: null, city: "Barcelona", url: "https://www.ibtmworld.com/", note: "November 2027, dates to be announced" },
  { slug: "iaee-expo-expo-2027", name: "IAEE Expo! Expo!", start: "2027-12-06", end: "2027-12-08", city: "New Orleans", url: "https://www.iaee.com/" },
];
