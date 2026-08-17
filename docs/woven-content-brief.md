# Woven Gathering app — content brief

**For the Woven content creator.** The app is built and live at
**woven.commonthreads.org.au**. This document is everything still needed to
finish it.

## How to use this

- Paste into a Google Doc and fill in the blanks. Type your answers under each
  **Answer:** line.
- Where we've already filled something in, it appears as **Currently in the app**.
  Read it and either confirm it or correct it — don't assume it's right. We wrote
  most of it from your public website, so it may be out of date or off-tone.
- **BLOCKING** means the app should not be promoted to delegates until it's
  answered.
- Anything marked **TO CONFIRM** in the app is a placeholder that will be visible
  to delegates. ~~There are 102 of them right now.~~ **All of them have now been
  cleared** — the returned brief has been implemented. See
  `woven-content-checklist.md` for what remains outstanding.
- The small grey line (like `brand.json → name`) tells the developer where the
  answer goes. Ignore it.
- Long answers are welcome. Several sections want multiple paragraphs.

## Where things stand

**Already done — please just check these (Part 1)**

Your fonts (Fjalla One for headings, Anuphan for body), your mission and taglines,
`info@thewovenproject.org`, your vision statement, your founding story, and the gathering's name, dates and city. All taken
from thewovenproject.org.

The **colours, logo and app icons now come from the Dreaming Into Our Future artwork** instead of
your website — see 1.6 and 1.8.

**Still needed from you**

| Part | What | Blocking? |
| --- | --- | --- |
| 2 | Acknowledgement of Country | **Yes** |
| 3 | Gathering basics — confirm dates, venue, city | **Yes** |
| 4 | Venue name, address, access | **Yes** |
| 5 | Programme — 30 sessions need descriptions; times need confirming | **Yes** |
| 6 | Speakers — 13 slots need names, organisations, bios, photos | **Yes** |
| 7 | Crew — 3 contacts, including the wellbeing role | **Yes** |
| 8 | Event guidance — 10 sections of practical info | **Yes** |
| 9 | Code of conduct | **Yes** |
| 10 | Participating organisations and sponsors | No |
| 11 | Group chats and surveys | No |
| 12 | Things to do near the venue | No |
| 13 | Shared photo gallery | No |
| 14 | Extra imagery | No |

---

# Part 1 — Check what we took from your website

Please confirm each of these or correct it.

**1.1 Organisation name**
<sub>`brand.json → name`</sub>
**Currently in the app:** `Woven`

Correct? If not:

**1.2 App header wordmark** — the text at the top of every screen.
<sub>`brand.json → wordmark`</sub>
**Currently in the app:** `Woven Gathering '26`

Correct? If not:

**1.3 App description** — used in search results and link previews.
<sub>`brand.json → description`</sub>
**Currently in the app:** "Woven is a global Indigenous organisation dedicated to climate justice, weaving Indigenous knowledge and building our power for climate action."

Correct? If not:

**1.4 Legal entity** — appears in the photo upload terms, so it must be the legal name, not the trading name.
<sub>`brand.json → legalEntity`</sub>
**Currently in the app:** `Woven` — your footer says “© 2025 Woven”; the registered entity is still to confirm.

Correct? If not:

**1.5 Support email** — shown throughout the guidance and code of conduct, and turned into a tappable link wherever it appears.
<sub>`integrations.json → supportEmail`</sub>
**Currently in the app:** `info@thewovenproject.org`

Is this the right address for delegate questions, or is there a dedicated one for the gathering?

Answer:

**1.6 Brand colours**
<sub>`tenant.json → theme.primary`, `theme.secondary`</sub>
**Currently in the app:** main colour `#F6931D` (sun orange), second colour `#0F75BB` (sky blue),
on a cream `#F3EEDF` background. These are sampled from the Dreaming Into Our Future artwork — the
orange and blue are the two colours of the primary lockup, and the cream is the t-shirt stock. The
app builds a full range of shades from each.

This replaces the deep green `#124a3e` and olive `#8a9826` we had previously read from your
website's stylesheet — those are the Woven Project's organisational colours rather than the
gathering's. Tell us if you'd rather the app stayed green-led.

Correct? If you have a brand guide with exact values, send it.

Answer:

**1.7 Fonts**
<sub>`tenant.json → theme.fonts`</sub>
**Currently in the app:** Fjalla One for headings, Anuphan for body text — the pair used on thewovenproject.org.

Correct?

Answer:

**1.8 Logo and app icon**
<sub>`brand.json → assets`</sub>
**Currently in the app:** the Dreaming Into Our Future artwork. The sun emblem fills the
home-screen icon, the favicons and the Apple touch icon; the header shows the emblem beside the
headline; the photo showreel shows a cream reversed version. Your Woven Project wordmark is still
in the repo at `/tenants/woven/logo-woven-project.png` if you want it shown as a partner mark.

This replaces the logo and favicon we downloaded from your website, and resolves the request for a
higher-resolution square icon — the emblem is square, so it needs no cropping.

Three things to confirm:

- The designer's deck contains **four competing logo directions** plus t-shirt mockups. We used the
  orange squiggle sun (pages 1–3). Is that the signed-off direction? Swapping to another is one command.
- Please confirm Woven owns this artwork and is happy for it to be used on this domain, and tell us
  whether any attribution is required.
- Should the header carry the gathering's identity, as it does now, or the Woven Project wordmark?
- The PDF is flattened artwork, not vector — if the designer can send the Illustrator or EPS source,
  the logo will stay sharp at every size.

Answer:

**1.9 Welcome slides** — five slides shown once, after the Acknowledgement of Country. We drafted these from your website — two are your own words verbatim.
<sub>`onboarding.json → slides`</sub>

**Currently in the app:**

1. *WELCOME TO WOVEN* — "Where Collective Knowledge Leads To Collective Strength" — "Woven weaves global Indigenous knowledge and builds back our power for climate justice — strengthening the health of our planet while strengthening the rights of our people."
2. *OUR VISION* — "Beginning With The Rightful Return Of Lands" — "We envision a climate-stable future that includes, values, and upholds Indigenous peoples and Indigenous-led climate solutions, beginning with the rightful return of lands and territories." *(your vision statement, verbatim)*
3. *SINCE 2009* — "A Vision Carried For Seventeen Years" — "Woven's roots trace to the Indigenous Peoples' Global Summit on Climate Change in Anchorage, Alaska, in 2009. Woven launched in 2025, and this is its first global gathering."
4. *HOW WE WORK* — "Gather, Share, Resource, Amplify" — "Our work centres on gathering Indigenous Peoples, creating and sharing global knowledges and tools, mobilising resources to directly support Indigenous-led climate action, and amplifying Indigenous-led climate movements." *(your wording, spelling localised)*
5. *SEPTEMBER 2026, GIMUY* — "Dreaming Into Our Future" — "Together we strengthen collective Indigenous-led climate justice strategies, promote the integration of traditional ecological knowledge into global climate solutions and policies, and foster a powerful, unified voice."

These are the first words most delegates will read. Please rewrite anything that
doesn't sound like Woven. You can also add or remove slides — three to six works
best.

Answer:

---

# Part 2 — Acknowledgement of Country — **BLOCKING**

This is the first thing every delegate sees, and they must tap to acknowledge it
before entering the app. **It is deliberately blank.** We have not drafted it,
because naming Country is not ours to do.

Your own site calls the host city **Gimuy**, the Yidinji name for Cairns, which
suggests the naming to use here. Cairns sits on the Country of the
**Gimuy Walubara Yidinji** people, with **Yirrganydji** Country along the coast.
Please confirm that with local Traditional Owners and have them write or approve
the wording.

**2.1 Heading**
<sub>`onboarding.json → acknowledgement.title`</sub>
**Currently:** `ACKNOWLEDGEMENT OF COUNTRY`

Answer:

**2.2 The Acknowledgement** — one or more paragraphs, naming the Country the
gathering is held on. For a global gathering you may also want to acknowledge the
many nations delegates are travelling from.

Answer:

**2.3 Closing statement** — a single line shown with emphasis at the end.

Answer:

**2.4 Who approved this wording, and when?** Recorded so it's clear this wasn't
drafted internally.

Answer:

---

# Part 3 — The gathering — **BLOCKING**

**3.1 Full name.** A name with a colon splits into a small overline and a large
title on the home screen.
<sub>`data.json → summits`</sub>
**Currently in the app:** `Dreaming into our Future: Global Indigenous Peoples' Climate Justice Gathering`
→ displays as "Dreaming into our Future" above "Global Indigenous Peoples' Climate Justice Gathering"

Correct? If not:

**3.2 Dates.** **Currently:** 6–12 September 2026. The programme in the app covers Monday 7 to Friday 11.

Confirm, or correct:

**3.3 City and state.** **Currently:** `Gimuy (Cairns), Queensland` — your site uses Gimuy, the Yidinji name.

Confirm, or correct:

**3.4 Roughly how many delegates, and from how many countries?** Not shown in the
app, but it tells us whether to expect crowding on the programme screen and
whether translation matters.

Answer:

---

# Part 4 — Venue — **BLOCKING**

Everything here is a placeholder. We didn't find the venue on your website.

**4.1 Venue name.**
<sub>`data.json → venues`</sub>
**Currently:** `Gathering Venue, Gimuy (Cairns)` (placeholder)

Answer:

**4.2 Full street address.**

Answer:

**4.3 Short description** — what the venue is, in a sentence or two.

Answer:

**4.4 Arrival and access instructions** — which entrance, parking and cost, public
transport, wheelchair access, lifts, accessible bathrooms. Delegates read this on
the morning of Day 1.

Answer:

**4.5 Venue website and a Google Maps link.**

Answer:

**4.6 Is more than one venue in use?** If sessions or the dinner are elsewhere,
list each with the same details.

Answer:

**4.7 Attach:** a photo of the venue, and any floor plan or parking map.

**4.8 Room names.** The programme currently says "Main Room" for everything. If
breakouts are in named rooms, tell us the names and which sessions are where.

Answer:

---

# Part 5 — The programme — **BLOCKING**

⚠️ **Read this first.** The programme in the app right now is **our
reconstruction, not your agenda.** We built 30 sessions across five days from
your published aims and your four focus areas. **The titles are plausible and the
times are invented.** All of it needs your confirmation or replacement.

If you already have an agenda in a spreadsheet, send that instead and ignore the
tables below — it'll be faster for everyone.

**5.1 Day names.** Each day gets a tab on the programme screen.
<sub>`program → days`</sub>

| Date | Day | Suggested name | Your name for it |
| --- | --- | --- | --- |
| Mon 7 Sep | Day 1 | Welcome and Opening | |
| Tue 8 Sep | Day 2 | Research and Evidence | |
| Wed 9 Sep | Day 3 | Ancestral Knowledge | |
| Thu 10 Sep | Day 4 | Shared Knowledge | |
| Fri 11 Sep | Day 5 | Network Building and Closing | |

**5.2–5.6 Sessions.** For each row: confirm or change the time and title, add a
short description (2–3 sentences, shown when a delegate taps the session), and
name the room. Rows marked **[speaker]** also need Part 6 filled in.

### Day 1 — Monday 7 September

| Time | Title | Description | Room |
| --- | --- | --- | --- |
| 08:30–09:30 | Registration | | |
| 09:30–10:30 | Welcome to Country and Opening Ceremony **[speaker]** | | |
| 10:30–11:00 | Morning Tea | | |
| 11:00–12:30 | Opening Plenary: Dreaming into our Future **[speaker]** | | |
| 12:30–13:30 | Lunch | | |
| 13:30–15:00 | Why We Gather: Climate Justice and Indigenous Rights **[speaker]** | | |
| 15:00–16:30 | Regional Introductions and Yarning Circles | | |

### Day 2 — Tuesday 8 September

| Time | Title | Description | Room |
| --- | --- | --- | --- |
| 09:00–10:30 | Mapping Indigenous Peoples in the Global Movement **[speaker]** | | |
| 10:30–11:00 | Morning Tea | | |
| 11:00–12:30 | Indigenous Caucuses: Achievements and Challenges **[speaker]** | | |
| 12:30–13:30 | Lunch | | |
| 13:30–15:00 | Climate Finance Mechanisms and Access **[speaker]** | | |
| 15:00–16:30 | Capacity Building Breakouts | | |

*Note: we built Day 2 around your published research, "Mapping Indigenous Peoples
in the Global Movement". If that research is being launched or presented at the
gathering, tell us how you'd like it framed.*

### Day 3 — Wednesday 9 September

| Time | Title | Description | Room |
| --- | --- | --- | --- |
| 09:00–10:30 | Traditional Ecological Knowledge in Climate Policy **[speaker]** | | |
| 10:30–11:00 | Morning Tea | | |
| 11:00–12:30 | Land Defence and Self-Determination **[speaker]** | | |
| 12:30–13:30 | Lunch | | |
| 13:30–15:00 | On Country Session | | |
| 18:30–21:00 | Gathering Dinner | | |

*The On Country session and the dinner are guesses. If either happens, we need the
location, how delegates get there, what to wear or bring, and whether it's
included.*

### Day 4 — Thursday 10 September

| Time | Title | Description | Room |
| --- | --- | --- | --- |
| 09:00–10:30 | Regional Voices: North America and the Arctic **[speaker]** | | |
| 10:30–11:00 | Morning Tea | | |
| 11:00–12:30 | Regional Voices: Africa and Asia **[speaker]** | | |
| 12:30–13:30 | Lunch | | |
| 13:30–15:00 | Regional Voices: Pacific and Latin America **[speaker]** | | |
| 15:00–16:30 | Amplifying Local Solutions | | |

*We used the three regions featured on your Shared Knowledge page. Which regions
are actually presenting?*

Answer:

### Day 5 — Friday 11 September

| Time | Title | Description | Room |
| --- | --- | --- | --- |
| 09:00–10:30 | Building a Unified Voice **[speaker]** | | |
| 10:30–11:00 | Morning Tea | | |
| 11:00–12:30 | Network Building: Where To From Here **[speaker]** | | |
| 12:30–13:30 | Lunch | | |
| 13:30–15:00 | Shared Commitments and Closing Ceremony | | |

**5.7 Sessions we've missed.** Add any rows needed — welcome reception, side
meetings, caucus meetings, press, cultural performances, free time, closing
dinner.

Answer:

**5.8 Session categories.** These control the colour and grouping on the
programme. Currently used: Opening, Plenary, Panel, Workshop, Breakout, Break,
Yarning, Dinner, Social, Closing, Logistics. Any to add or rename?

Answer:

---

# Part 6 — Speakers — **BLOCKING**

There are **13 speaker slots** in the programme, all showing "TO CONFIRM" as the
name. For each, we need:

- Full name, and how they'd like it displayed
- Their organisation
- Role or title
- A short biography (a paragraph is plenty)
- A headshot — landscape or square, at least 600px wide
- Which session they're in
- Format: Keynote, Panel, Lightning Talk, Plenary, or Guest Speaker

The 13 slots, by session:

| # | Session | Day |
| --- | --- | --- |
| 1 | Welcome to Country and Opening Ceremony | Mon 7 |
| 2 | Opening Plenary: Dreaming into our Future | Mon 7 |
| 3 | Why We Gather: Climate Justice and Indigenous Rights | Mon 7 |
| 4 | Mapping Indigenous Peoples in the Global Movement | Tue 8 |
| 5 | Indigenous Caucuses: Achievements and Challenges | Tue 8 |
| 6 | Climate Finance Mechanisms and Access | Tue 8 |
| 7 | Traditional Ecological Knowledge in Climate Policy | Wed 9 |
| 8 | Land Defence and Self-Determination | Wed 9 |
| 9 | Regional Voices: North America and the Arctic | Thu 10 |
| 10 | Regional Voices: Africa and Asia | Thu 10 |
| 11 | Regional Voices: Pacific and Latin America | Thu 10 |
| 12 | Building a Unified Voice | Fri 11 |
| 13 | Network Building: Where To From Here | Fri 11 |

**A spreadsheet is much easier than this document for speakers** — one row per
person with those columns. Ask us for a template.

**6.1 Are there panels with several speakers?** The app currently shows one
speaker per session. Tell us which sessions have multiple and we'll adjust.

Answer:

**6.2 Anyone who should not have a photo or bio published?**

Answer:

---

# Part 7 — Crew — **BLOCKING**

Delegates use this to find help. Three placeholder contacts exist.

For each crew member: name, role, photo, organisation, work email, phone, and
languages spoken.

**7.1 The wellbeing contact is load-bearing.** The code of conduct page links
delegates to whoever holds this role, and the app matches it by exact job title.

**Currently in the app:** `Wellbeing and Grievance Coordinator`

Use that exact title, or tell us the title you'll use — and make sure the same
wording appears in the crew list. If they don't match character for character,
the link silently won't work.

Answer — the exact title:

Answer — who holds it:

**7.2 Everyone who should appear.** Registration desk, accessibility lead,
first aid, media/comms, interpreters, technical support.

Answer:

**7.3 Should phone numbers be visible to all delegates?** They become tappable
call and WhatsApp links.

Answer:

---

# Part 8 — Event guidance — **BLOCKING**

Usually the most-read screen. All ten sections are placeholders.

Any web address or your support email typed in here becomes a link automatically —
just write them inline.

**8.1 Registration** — arrival time on Monday 7 September, where to check in, what
delegates collect, where the help desk and lost property are.

Answer:

**8.2 Meals** — which meals are provided on which days, and what delegates arrange
themselves. The programme currently shows morning tea and lunch daily plus the
Wednesday dinner. Also: how are dietary requirements handled, and is there halal,
kosher, vegetarian and vegan provision?

Answer:

**8.3 Getting to Cairns and to the venue** — airport to accommodation, airport to
venue, travel time, what's covered for delegates on travel support, luggage
storage.

Answer:

**8.4 Visas and international travel** — this is a global gathering, so most
delegates travel internationally. Which Australian visa is needed, how far ahead
to apply, who issues letters of invitation, and by when.

Answer:

**8.5 Accommodation** — is it arranged or self-booked? Recommended hotels, any
block booking or rate code, distance from the venue.

Answer:

**8.6 Children** — welcome or not, what notice you need for catering and access,
whether childcare is provided. Please be explicit either way; delegates plan
long-haul travel around this.

Answer:

**8.7 Weather and what to pack** — September in Cairns is tropical dry season.
Heat, sun protection, insect repellent, anything needed for an On Country session.
Include a link to the local forecast.

Answer:

**8.8 Illness policy** — what to do if unwell before travelling or during the
gathering, and what's available on site.

Answer:

**8.9 Accessibility** — venue accessibility, interpreting and translation across
delegates' languages, quiet spaces, and who to contact about access needs. Name a
person if there is one.

Answer:

**8.10 Wellbeing** — this gathering covers land defence, dispossession and climate
loss, which carry real weight for delegates with lived experience. What support is
available, and who to approach.

Answer:

**8.11 Nearby essentials** — nearest pharmacy, convenience store and supermarket,
with opening hours and map links.

Answer:

**8.12 Anything else** — wifi and password, prayer or ceremony space, smoking
areas, ATMs, SIM cards, dress code, photography and consent, media policy.

Answer:

---

# Part 9 — Code of conduct — **BLOCKING**

**9.1 The full code of conduct.** Structure it as a short introduction followed by
headed groups of bullet points. The app currently has four empty headings:

- Our Shared Commitments
- How We Show Up
- Care, Safety & Community
- Shared Responsibility

Rename or replace them as you like.

Answer:

**9.2 Page subtitle.** **Currently:** `Code of Conduct - A Shared Commitment`

Answer:

**9.3 Reporting.** What should someone do if they feel unsafe, and who do they
contact? This links to the crew role from 7.1.

Answer:

**9.4 Do you have a printable PDF?** Attach it and we'll add a download button.

Answer:

---

# Part 10 — Organisations and sponsors

**10.1 Participating organisations.** Three placeholders exist. For each: name,
country, a one-or-two-sentence summary, website, and a logo. This can be a long
list — a spreadsheet is easier.

Flag any logo that is white or very pale, so we can put a backing plate behind it.

Answer:

**10.2 Sponsors and funders.** For each: name, level (Supporter, Partner, Major,
or your own wording), a sentence about them, website, logo.

Answer:

**10.3 Any organisation that must NOT be listed publicly?**

Answer:

---

# Part 11 — Group chats and surveys

**11.1 Is there a delegate group chat?** WhatsApp, Signal or similar. Paste the
invite link. Leave blank and the button stays hidden.
<sub>`integrations.json → communityChatUrl`</sub>

Answer:

**11.2 Topic channels.** Two placeholders exist (Announcements, Wellbeing). For
each: name, one-line description, invite link, and a suggested icon (megaphone,
heart, wheelchair, shopping trolley, family, shield).

Answer:

**11.3 Feedback forms or surveys.** For each: name, description, and the form link
(Google Forms works — it embeds inside the app).

Answer:

**11.4 Public transport.** **Currently in the app:** "Plan your trip with Translink
Far North Queensland" linking to translink.com.au. Correct for Cairns, or is
there something better?

Answer:

---

# Part 12 — Things to do nearby

Two placeholders exist. Optional, but well used at multi-day events — especially
by delegates who arrive early or stay on.

For each: name, a short description, a Google Maps link, and a photo. Cultural
sites, Traditional Owner–led tours, and places of significance are more valuable
here than generic tourism.

Answer:

---

# Part 13 — Shared photo gallery

Delegates can add photos to a shared gallery. Woven's gallery is completely
separate from any other event's.

**13.1 Do you want the gallery on?** It's currently enabled and empty.

Answer:

**13.2 Who moderates it?** Moderators can delete photos. They need a password —
we'll set that up; don't put it in this document.

Answer:

**13.3 Consent.** Photography at Indigenous gatherings often needs explicit
protocols. Are there sessions or ceremonies where photography is not permitted?
Should the upload screen carry a warning?

Answer:

**13.4 Upload terms.** The standard terms assign the organisation named in 1.4 the
right to use uploaded photos. If Woven's lawyers want different wording, paste it
here.

Answer:

---

# Part 14 — Extra imagery

**14.1 Welcome background photo** — a full-screen image behind the welcome slides.
Landscape, at least 2000px wide. **No longer borrowed** — it now uses your own night ceremony
photo (`bw-participant-2`), which is 1130px wide. That is under the 2000px we would like for large
screens, so a higher-resolution original would help. Happy to switch to another of your photos.

Answer:

**14.2 Home screen background video** — optional, short, silent, looping, under
5MB. Also currently borrowed from Common Threads.

Answer:

**14.3 Social sharing image** — shown when someone shares a link. We generate a
simple one from your name and colours; a designed image is better if you have one.

Answer:

**14.4 Session and topic images** — optional photos for individual sessions.

Answer:

---

# Checklist before sending this back

- [ ] Part 1 checked, not just skimmed — especially the welcome slides (1.9)
- [ ] Acknowledgement of Country written or approved by Traditional Owners (Part 2)
- [ ] Venue name, address and access confirmed (Part 4)
- [ ] Programme times and titles corrected — ours are invented (Part 5)
- [ ] Speaker details for all 13 slots, with photos (Part 6)
- [ ] The wellbeing job title in 7.1 matches the crew list exactly
- [ ] All ten guidance sections written (Part 8)
- [ ] Code of conduct supplied (Part 9)
- [ ] Higher-resolution square logo for the phone home-screen icon (1.8)
- [ ] Confirmed Woven owns the logo and favicon we took from the website (1.8)
- [ ] No passwords in this document — send those separately

## Questions

Anything unclear, or a question that doesn't fit anywhere above:

Answer:
