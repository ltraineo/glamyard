# Who's Going (working title)

A private, invite-only list of who is going to which industry events. Seeded with 15
event tech and business-of-events conferences for 2027.

## How it works

- **Invite only.** The first person to sign in becomes the founder and admin. Everyone
  else joins through a single-use invite link from an existing member.
- **Vouching.** Every profile shows who invited that person.
- **Check-ins.** Members mark the events they will attend and see who else is going.
  People in your invite chain are listed first.
- **Admin.** The founder sees the member list, invite acceptance rate, and can remove a
  member or a member plus everyone they brought in.
- **No invite cap** by default. Set `INVITE_CAP` to turn one on.

## Run locally

```
npm install
npm run dev
```

With no `DATABASE_URL`, the app stores data in a local `.data` folder. Delete that
folder to start over.

## Configuration

See `.env.example`. For production you need `SESSION_SECRET` and `DATABASE_URL`
(any Postgres). Tables and the seed events are created automatically on first run.

### LinkedIn sign-in

Until `LINKEDIN_CLIENT_ID` is set, the app uses a placeholder sign-in that accepts an
email with no verification. That is for testing only. Do not invite real people until
LinkedIn is on.

1. Create an app at https://www.linkedin.com/developers/apps
2. Add the product "Sign In with LinkedIn using OpenID Connect"
3. Add the redirect URL `https://YOUR-DOMAIN/auth/linkedin/callback`
4. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `APP_URL`

A founder account created with the placeholder is linked to LinkedIn automatically on
first LinkedIn sign-in, as long as the email matches and LinkedIn reports it verified.

## Editing the event list

Events live in `lib/seed.ts`. New entries are added on the next start. Existing rows are
not overwritten, so date changes to an existing event need a database update.
