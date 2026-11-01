# Patagonien-Blog einrichten (ca. 20–30 Minuten)

Am Ende habt ihr eine eigene Seite unter `https://DEINNAME.github.io/patagonien/`.
- Familie & Freunde: lesen, reagieren und kommentieren ohne Account.
- Victor & Felix: melden sich per E-Mail-Link an und posten Fotos, Videos und Text.
- Kosten: 0 € (kostenlose Tarife von GitHub und Supabase).

## 1. Supabase (Datenbank & Fotospeicher)
1. Auf https://supabase.com mit GitHub oder E-Mail registrieren.
2. **New project** anlegen: Name `patagonien`, Region **Frankfurt (eu-central-1)**, Datenbank-Passwort generieren lassen und sicher ablegen.
3. Warten, bis das Projekt bereit ist (1–2 Min.).
4. Links **SQL Editor** → **New query** → Inhalt von `schema.sql` einfügen. **Run**.
5. **Authentication → Users → Add user → Send invitation**: einmal für dich, einmal für Felix. Nur diese beiden können sich später anmelden.
6. **Project Settings → API**: `Project URL` und den Key `anon public` kopieren. Beides kommt in `config.js` (der anon-Key ist öffentlich, das ist so gedacht).

## 2. GitHub (Hosting der Seite)
1. Auf https://github.com registrieren (falls noch nicht).
2. Neues **öffentliches** Repository `patagonien` anlegen (leer, ohne README).
3. Mir den Namen schicken (z. B. `victorthoma/patagonien`). Ich lade die Dateien hoch.
4. Im Repo: **Settings → Pages → Branch: main / root → Save**. Nach 1–2 Min. ist die Seite unter `https://DEINNAME.github.io/patagonien/` erreichbar.

## 3. Verbinden
1. In Supabase: **Authentication → URL Configuration → Site URL** = deine GitHub-Pages-Adresse. Bei **Redirect URLs** dieselbe Adresse eintragen.
2. `config.js` mit URL, anon-Key und Seitenadresse füllen (mache ich, wenn du mir die Werte schickst).

## 4. WhatsApp-Broadcast-Liste (einmalig, am Handy)
1. WhatsApp → Chats → **Broadcast-Listen** (iPhone: oben links; Android: Menü ⋮) → **Neue Liste**.
2. Alle Empfänger auswählen, Name z. B. „Patagonien 🏔️“.
3. Wichtig: Nur wer **deine Nummer gespeichert** hat, bekommt die Nachrichten. Kurz Bescheid geben!
4. Maximal 256 Personen pro Liste. Broadcasts gehen nur am Handy, nicht über WhatsApp Web.

## So postet ihr unterwegs
1. Seite öffnen → ganz unten „Für Victor & Felix“ → E-Mail eingeben → Link in der Mail antippen (einmal pro Gerät).
2. Oben erscheint „Neuer Post“: Wer, Wo, Lebenszeichen, Text, Fotos/Videos → **Veröffentlichen**.
3. Danach **Per WhatsApp teilen** → WhatsApp → Broadcast-Liste wählen → Senden. Der Text liegt zusätzlich in der Zwischenablage, falls WhatsApp ihn beim Foto weglässt.
4. Ältere Posts lassen sich über ihren eigenen „Per WhatsApp teilen“-Knopf nochmal schicken.

Tipp für den Trek: Fotos werden beim Hochladen automatisch verkleinert. Videos bleiben in Originalgröße, also lieber kurze Clips und nur mit WLAN hochladen.
