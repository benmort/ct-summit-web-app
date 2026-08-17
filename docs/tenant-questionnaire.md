# New event app — content questionnaire

**For the content creator.** Fill this in and hand it back. Everything the app shows comes from your answers; nothing here requires you to touch code.

**How to use it**

- Answer in the blank line under each question. If an answer doesn't apply, write `n/a` — don't delete the question.
- Anything marked **Required** must be answered before the app can go live.
- The small grey line under each question (like `brand.json → name`) tells the developer where the answer goes. Ignore it.
- Where a **Common Threads example** is shown, that's the real answer from the existing app. Use it as a guide for length and tone, not as text to copy.
- Long answers are fine. Several sections want multiple paragraphs, and there's no limit.

**A note on copying.** Please don't copy answers from another event, especially in section 4. The app has automated checks that reject a new event reusing another's Acknowledgement of Country or brand name.

---

## 1. Identity and domain

**1.1 What is the event or organisation called?** Short form, as it should appear in the browser tab and when shared. **Required**
<sub>`brand.json → name`</sub>
> *Common Threads example:* `Common Threads`

Answer:

**1.2 What should the wordmark in the app header say?** This is the text at the top of every screen. It often includes the year. **Required**
<sub>`brand.json → wordmark`</sub>
> *Common Threads example:* `Common Threads Summit '26`

Answer:

**1.3 What web address should the app live at?** For example `woven.yourdomain.org`. If you don't know yet, say so and we'll use a temporary one. **Required**
<sub>`tenant.json → domains`</sub>

Answer:

**1.4 One or two sentences describing the app.** This appears in search results and when someone shares a link. **Required**
<sub>`brand.json → description`</sub>
> *Common Threads example:* `Common Threads summit platform for schedule, speakers, organisations, and community moments.`

Answer:

**1.5 What is the full legal name of the organisation running the event?** Used in the media-upload terms, so it must be the legal entity, not the trading name. **Required**
<sub>`brand.json → legalEntity`</sub>
> *Common Threads example:* `Common Threads Indigenous Peoples Organisation`

Answer:

**1.6 What email address should participants contact for help?** This appears throughout the guidance and code-of-conduct pages, and is turned into a clickable link automatically wherever it's mentioned. **Required**
<sub>`integrations.json → supportEmail`</sub>
> *Common Threads example:* `summit@commonthreads.org.au`

Answer:

**1.7 Which country are most participants dialling from?** Used to format crew phone numbers correctly.

Answer:

---

## 2. Look and feel

**2.1 What is your main brand colour?** Give a hex code if you have one (e.g. `#0d9488`), or describe it and attach a logo we can read it from. This becomes buttons, links, highlights and headings. **Required**
<sub>`tenant.json → theme.primary`</sub>
> *Note:* the app builds a full range of ten shades around this colour automatically. You only need the one.

Answer:

**2.2 What is your second brand colour?** Used sparingly, for accents. **Required**
<sub>`tenant.json → theme.secondary`</sub>

Answer:

**2.3 Should the app be light or dark?** Pick one. **Required**
<sub>`tenant.json → theme.mode`</sub>

- **Dark** — light text on near-black. What Common Threads uses. Good in dim rooms and for photography.
- **Light** — dark text on near-white. Better in bright outdoor venues and for a softer feel.

Answer:

**2.4 Is any specific shade of your brand colour non-negotiable?** For example, if your brand guide specifies an exact button colour. Otherwise leave blank.
<sub>`tenant.json → theme.overrides`</sub>

Answer:

**2.5 Do you have fonts the brand must use?** Name the heading font and the body font. Leave blank to use the device's default, which is what Common Threads does.
<sub>`tenant.json → theme.fonts`</sub>
> Already set up and ready to use: **Fjalla One** (headings) and **Anuphan** (body) — the pair used on thewovenproject.org. Any other Google Font can be added in a few minutes. A font you have licensed separately needs the files sent to us.

Answer — heading font:

Answer — body font:

---

## 3. Logos and imagery

For each item, attach the file or say "use default". Preferred formats are noted.

**3.1 Wordmark / logo** — shown on the photo showreel, which sits on a near-black backdrop in every theme, so send the light or reversed variant. PNG or SVG with a transparent background. **Required**
<sub>`brand.json → assets.logo` — `{ src, width, height, alt? }`, where width and height are the file's true pixel dimensions</sub>

Answer:

**3.1a Header logo** — optional. Replaces the text wordmark from 1.2 in the app header. Send the variant that suits your answer to 2.3: the header sits on a near-white surface in light mode and a near-black one in dark mode. It renders about 28px tall, so anything with a strapline or more than two lines of type turns to mush — send a compact lockup, not the full one.
<sub>`brand.json → assets.headerLogo` — same `{ src, width, height, alt? }` shape as 3.1. Omit it entirely to keep the text wordmark.</sub>

Answer:

**3.2 App icon** — the icon on someone's phone home screen. A square image, at least 512×512, no transparency. Note it is used as a **maskable** icon, so Android crops it to a circle or squircle — keep the artwork inside the middle 80% or the edges get sliced off. **Required**
<sub>`brand.json → assets.androidChrome`, `assets.appleTouchIcon`, `assets.favicon`</sub>

Answer:

**3.3 Welcome background image** — a full-screen photo behind the welcome slides. Landscape, at least 2000px wide. Choose something local and meaningful; it's the first thing anyone sees.
<sub>`brand.json → assets.onboardingBackground`</sub>

Answer:

**3.4 Home screen background video** — an optional short, silent, looping video behind the dashboard header. Under 5 MB, MP4.
<sub>`brand.json → assets.heroVideo`</sub>

Answer:

**3.5 What colour should the phone's browser bar be?** Usually your darkest or lightest brand colour depending on the answer to 2.3.
<sub>`brand.json → themeColor`</sub>

Answer:

---

## 4. Acknowledgement of Country

This is the first thing every participant sees, and they must tap to acknowledge it before entering. Please have it written or approved by the relevant Traditional Owners. **Do not reuse another event's wording** — it names specific Country and the app will reject a duplicate.

**4.1 Heading.** **Required**
<sub>`onboarding.json → acknowledgement.title`</sub>
> *Common Threads example:* `ACKNOWLEDGEMENT OF COUNTRY`

Answer:

**4.2 The Acknowledgement itself.** One or more paragraphs. Name the Country the event is held on. **Required**
<sub>`onboarding.json → acknowledgement.paragraphs`</sub>
> *Common Threads example:* "The Common Threads National Summit will be held on the lands of the Kaurna people. The planning and organisation of Common Threads has taken place across the country, on the lands of many nations. We pay our respect to their Elders past and present, and thank them for their ongoing custodianship and continued fight to protect Country."

Answer:

**4.3 Closing statement.** A single line, shown with emphasis at the end. **Required**
<sub>`onboarding.json → acknowledgement.sovereigntyStatement`</sub>
> *Common Threads example:* `Sovereignty has never been ceded - this always was and always will be Aboriginal land.`

Answer:

**4.4 What should the button say?**
<sub>`onboarding.json → acknowledgement.acceptLabel`</sub>
> *Common Threads example:* `Acknowledge and continue`

Answer:

---

## 5. Welcome slides

A short swipeable introduction shown once, after the Acknowledgement. Common Threads uses five slides; use as few or many as you like, but 3–6 works best. Each slide has a small label, a heading, and a short paragraph.

**Copy the block below once per slide.**

**Slide __**
<sub>`onboarding.json → slides[]`</sub>

- Small label above the heading (usually upper case) — <sub>`eyebrow`</sub>
  > *Common Threads example:* `BUILDING MOVEMENT POWER`

  Answer:

- Heading — <sub>`heading`</sub>
  > *Common Threads example:* `Building Power For Landback, Treaty And Justice`

  Answer:

- Paragraph — <sub>`paragraphs`</sub>
  > *Common Threads example:* "It's critical that we come together, organise and build the power of our movements to continue to fight for Landback, Treaty and Justice."

  Answer:

**5.x Anything else about the sequence?** For example, if a particular slide must come first or last.

Answer:

---

## 6. "Add to home screen" prompt

Shown once, encouraging people to install the app on their phone.

**6.1 Heading.**
<sub>`onboarding.json → homescreenPrompt.title`</sub>
> *Common Threads example:* `SAVE TO HOME SCREEN`

Answer:

**6.2 Explanation.** One sentence on why it's worth doing.
<sub>`onboarding.json → homescreenPrompt.body`</sub>
> *Common Threads example:* `For faster access during Summit, add Common Threads to your phone home screen.`

Answer:

*The step-by-step iPhone and Android instructions are standard and already written. You only need to answer 6.1 and 6.2 unless you want them reworded.*

---

## 7. Menus and page labels

The app has a bottom bar with four shortcuts and a full menu with thirteen entries. Each menu entry has a label and a one-line description.

**7.1 Which four sections deserve the bottom bar?** These are the most-used screens. **Required**
<sub>`navigation.json → tabs`</sub>
> *Common Threads example:* Home, Program, Speakers, Moments

Answer:

**7.2 Do you want to rename any sections?** The defaults are below. Only fill in the ones you want changed — for example, an event that isn't a summit might prefer "Schedule" over "Program", or "Team" over "Crew".
<sub>`navigation.json → menu[].label`</sub>

| Default label | Your preferred label |
| --- | --- |
| Home | |
| Program | |
| Event Guidance | |
| Speakers | |
| Crew | |
| Moments | |
| Venues | |
| Events | |
| Attractions | |
| Organisations | |
| Sponsors | |
| Surveys | |
| Code of Conduct | |

**7.3 Should any section be hidden?** For example, if you have no sponsors or aren't running surveys.

Answer:

**7.4 One-line description for each section.** These sit under the label in the menu. Defaults are shown; overwrite any you want to change.
<sub>`navigation.json → menu[].subtitle` and `pageSubtitles`</sub>

| Section | Default description | Your version |
| --- | --- | --- |
| Home | Summit dashboard and quick links | |
| Program | Session agenda and daily timings | |
| Event Guidance | Travel logistics, access and wellbeing | |
| Speakers | Meet summit speakers and contributors | |
| Crew | Find the summit support team | |
| Moments | Shared photos and videos gallery | |
| Venues | Venue locations, maps and access | |
| Events | Sessions, breaks and activity blocks | |
| Attractions | Things to do around summit | |
| Organisations | Participating organisations and network partners | |
| Sponsors | Supporting partners behind the summit | |
| Surveys | Feedback forms and pulse checks | |
| Code of Conduct | Community safety expectations and support | |

---

## 8. Event guidance

The practical-information page — usually the most-read screen. Common Threads has eleven sections. Add, remove or reorder freely.

Any web address or the support email from 1.6 becomes a clickable link automatically, so just write them inline.

For each section, give a **heading** and **one or more paragraphs**.
<sub>`guidance.json → sections[]`</sub>

**8.1 Registration** — when and where to arrive on day one, what to collect, where the help desk is. **Required**
> *Common Threads example:* "Please arrive for registration around 8:30am on Day 1, Tuesday May 12." … "The registration desk will also act as a help desk and lost and found."

Answer:

**8.2 Meals** — which meals are provided on which days, and what people arrange themselves. **Required**

Answer:

**8.3 Social event** — what's on, when, where, and whether it's included.

Answer:

**8.4 Getting there / airport transfers** — how people reach the venue, travel times, what's covered, luggage storage.

Answer:

**8.5 Children** — whether children are welcome, what notice you need, whether childcare is provided. Please be explicit either way; people plan travel around this.

Answer:

**8.6 Weather and what to pack** — include a link to the local forecast if you have one.

Answer:

**8.7 Illness policy** — what to do if unwell before or during, and what's available on site. **Required**

Answer:

**8.8 Accessibility** — venue accessibility, and who to contact about access needs. Name a person if there is one. **Required**

Answer:

**8.9 Wellbeing** — the difficult topics likely to come up, and what support is available. **Required**

Answer:

**8.10 Nearby essentials** — nearest pharmacy, convenience store and supermarket, with opening hours and map links.

Answer:

**8.11 Anything else?** Add as many extra sections as you need — wifi, prayer rooms, smoking areas, quiet spaces, dress code.

Answer:

---

## 9. Code of conduct

**9.1 The full code of conduct.** Structure it as a short intro followed by headed groups of bullet points. Common Threads uses four groups: *Our Shared Commitments*, *How We Show Up*, *Care, Safety & Community*, *Shared Responsibility*. **Required**
<sub>`data.json → codeConduct`</sub>

Answer:

**9.2 Subtitle for the page.**
> *Common Threads example:* `Code of Conduct - A Shared Commitment`

Answer:

**9.3 Who should someone contact if they feel unsafe?** Give the **exact job title** you'll use for these people in the crew list at 12.6 — the app links the two together, and the wording must match character for character. **Required**
> *Common Threads example:* `Wellbeing and Grievance Coordinator`

Answer:

**9.4 Do you have a printable PDF of the code of conduct?** Attach it if so.

Answer:

---

## 10. Photo and video uploads

Participants can add photos to a shared gallery. The upload screen shows terms explaining what the organisation may do with them.

**10.1 Are you running the shared photo gallery?** Yes / no.

Answer:

**10.2 Who moderates it, and what should the moderation password be?** Send the password separately, not in this document.

Answer:

**10.3 Do you want the standard upload terms, or your own?** The standard terms assign the organisation named in 1.5 the right to use uploaded media. If your lawyers want different wording, paste it here.

Answer:

---

## 11. Group chats and links

**11.1 Do you have a main community group chat?** Paste the invite link. Leave blank and the button is hidden.
<sub>`integrations.json → communityChatUrl`</sub>

Answer:

**11.2 List any topic-specific channels.** For each: name, one-line description, invite link, and a suggested icon (e.g. megaphone, heart, wheelchair, shopping trolley).
<sub>`data.json → whatsappChannels`</sub>
> *Common Threads example:* Announcements, Parents & Carers, Health & Illness, Accessibility Support, Wellbeing, Nearby Essentials

Answer:

**11.3 Is there a public transport planner for the host city?** Give its name and link.
<sub>`integrations.json → transport`</sub>
> *Common Threads example:* `Plan your trip with Adelaide Metro` → `adelaidemetro.com.au`

Answer:

**11.4 Any feedback forms or surveys?** For each: name, description, and the form link.
<sub>`data.json → surveys`</sub>

Answer:

---

## 12. The event content itself

This is the bulk of the work. **A spreadsheet is easier than this document for these** — one tab per heading below. Ask the developer for a template.

**12.1 The event.** Full name (a name with a colon splits into a small line and a big line on the home screen — e.g. *"Common Threads Summit 2026: The Next Horizon"*), city and state, start date, end date. **Required**
<sub>`data.json → summits`</sub>

Answer:

**12.2 The days.** For each day: the date, a short name (e.g. *Youth Summit Day*, *First Summit Day*), and which venue it's at. These become the tabs on the programme screen. **Required**

Answer:

**12.3 The schedule.** Every time slot: date, start time, end time, venue. **Required**

**12.4 Sessions.** For each: title, description, which time slot it's in, room or area, venue, and a category (Opening, Plenary, Workshop, Breakout, Break, Social, Dinner, Closing, Panel, Yarning, Logistics). **Required**
<sub>`data.json → events`</sub>

**12.5 Speakers.** For each: full name, session title, organisation, biography, headshot, which time slot they're in, room, and format (Keynote, Panel, Lightning Talk, Plenary, Guest Speaker). **Required**
<sub>`data.json → speakers`</sub>

**12.6 Crew.** For each: name, role or roles, photo, organisation, work email, phone, languages spoken. Remember that one role must exactly match your answer to 9.3.
<sub>`data.json → crew`</sub>

**12.7 Venues.** For each: name, subtitle, suburb, full address, contact email, website, map link, parking link and cost, description, and arrival/access instructions. Attach a venue photo and any floor-plan or parking maps.
<sub>`data.json → venues`</sub>

**12.8 Attractions.** Things to do nearby: name, description, map link, photo.
<sub>`data.json → attractions`</sub>

**12.9 Organisations.** Participating organisations: name, country, one-or-two-sentence summary, website, logo. Flag any logo that needs a white background behind it (usually white or very light logos).
<sub>`data.json → organisations`</sub>

**12.10 Sponsors.** For each: name, level (e.g. Supporter, Partner, Major), description, website, logo.
<sub>`data.json → sponsors`</sub>

---

## 13. Anything else

**13.1 Is there anything about this event the app should handle differently?**

Answer:

**13.2 Anything in the existing Common Threads app you specifically want changed or kept?**

Answer:

---

## Checklist before handing back

- [ ] Every **Required** question answered
- [ ] Section 4 written or approved by the relevant Traditional Owners, and not copied from another event
- [ ] Two brand colours given as hex codes, and light-or-dark chosen (2.1–2.3)
- [ ] Logo and app icon attached (3.1, 3.2)
- [ ] The job title in 9.3 matches a role in 12.6 exactly
- [ ] Dates in section 12 are correct, including the year
- [ ] Passwords and other secrets sent separately, not in this document
