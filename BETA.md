# Beta environment

Beta runs the `beta` branch on the homelab server next to production, so changes can be tried on a copy of real data before they reach `main`.

| | Production | Beta |
|---|---|---|
| Branch | `main` | `beta` |
| URL | https://splitzy.aarshiv.xyz | https://splitzy-beta.aarshiv.xyz |
| API container | `splitzy-api` (networks `splitzy` + `cloudflare`) | `splitzy-api-beta` (same networks) |
| UI container | `splitzy-ui` (network `cloudflare`) | `splitzy-ui-beta` (network `cloudflare`) |
| Database | `splitzy` on the `postgres` container | `splitzy_beta` on the same server, login `splitzy_beta` |
| RabbitMQ | `splitzy-main-queue`, `splitzy-retry-queue`, `splitzy-dead-letter-queue` on `rabbit-mq` | `splitzy-beta.main-queue`, `splitzy-beta.retry-queue`, `splitzy-beta.dead-letter-queue`, user `splitzy_beta` |
| Images | `rghvgrv/splitzy-api:latest` (Docker Hub) | `localhost/splitzy-api:beta`, `localhost/splitzy-ui:beta` (built on the server, never pushed) |
| Email | sent | **disabled** (beta holds a copy of real users) |

All commands run on the server as `splitzy@homelab` with rootless Podman.

## ⚠️ Rules that keep production safe

1. `~/splitzy-beta.env` must only ever contain `Database=splitzy_beta` and queue names starting with `splitzy-beta.`. The API applies migrations at startup, so a wrong database name would migrate production.
2. Never tag beta images `latest` or push them to Docker Hub. Production runs `latest`.
3. Keep email disabled in beta. With real SMTP settings, beta would email real users.
4. The `splitzy_beta` database login has no rights on production tables, and the `splitzy_beta` RabbitMQ user can only use `splitzy-beta.*` queues. Don't widen either.

A helper used below to run SQL against the beta database:

```bash
sqlbeta() { podman exec -i postgres sh -c 'psql -U "$POSTGRES_USER" -d splitzy_beta -tA'; }
```

---

## One-time setup

### 1. Passwords

```bash
BETA_DB_PW=$(openssl rand -hex 24); BETA_MQ_PW=$(openssl rand -hex 24)
echo "$BETA_DB_PW $BETA_MQ_PW" > ~/.splitzy-beta-pw && chmod 600 ~/.splitzy-beta-pw
```

In a new terminal, reload them with `read BETA_DB_PW BETA_MQ_PW < ~/.splitzy-beta-pw`.

### 2. Database: create `splitzy_beta` as a copy of production

```bash
podman exec postgres sh -c "psql -U \"\$POSTGRES_USER\" -d postgres -c \"CREATE ROLE splitzy_beta LOGIN PASSWORD '$BETA_DB_PW'\" -c 'CREATE DATABASE splitzy_beta OWNER splitzy_beta'"

podman exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc splitzy | pg_restore -U "$POSTGRES_USER" -d splitzy_beta --no-owner --role=splitzy_beta'

echo 'SELECT max("MigrationId") FROM "__EFMigrationsHistory";' | sqlbeta
```

The last command prints the same migration production is on. `pg_dump` only reads; production keeps working during the copy.

### 3. RabbitMQ: a user limited to beta queues

```bash
podman exec rabbit-mq rabbitmqctl add_user splitzy_beta "$BETA_MQ_PW"
podman exec rabbit-mq rabbitmqctl set_permissions -p / splitzy_beta \
  '^splitzy-beta\..*' '^(splitzy-beta\..*|amq\.default)$' '^splitzy-beta\..*'
```

The API has no virtual-host setting, so isolation comes from these permissions. The queues are created by the API on first start.

### 4. Code and images

```bash
git clone -b beta https://github.com/Splitzzyy/Splitzy.git ~/splitzy-beta
cd ~/splitzy-beta
podman build -t localhost/splitzy-api:beta backend/splitzy-dotnet

sed -e 's#production: false#production: true#' \
    -e "s#apiBaseUrl: '[^']*'#apiBaseUrl: 'https://splitzy-beta.aarshiv.xyz'#" \
    UI/src/environments/environment.ts > UI/src/environments/environment.prod.ts
podman build -t localhost/splitzy-ui:beta UI
```

`environment.prod.ts` is empty in git (CI fills it for production), so beta generates its own pointing at the beta URL.

### 5. Settings file

```bash
cat > ~/splitzy-beta.env <<EOF
ASPNETCORE_ENVIRONMENT=Beta
Postgres__ConnectionString=Host=postgres;Port=5432;Database=splitzy_beta;Username=splitzy_beta;Password=$BETA_DB_PW
Jwt__Key=$(openssl rand -base64 48)
OtpJwt__Key=$(openssl rand -base64 48)
Google__ClientId=181191664943-7db5glvs01ifeno7o78kotd9ujv910db.apps.googleusercontent.com
MessagingService__HostName=rabbit-mq
MessagingService__Port=5672
MessagingService__UserName=splitzy_beta
MessagingService__Password=$BETA_MQ_PW
MessagingService__MainQueue=splitzy-beta.main-queue
MessagingService__RetryQueue=splitzy-beta.retry-queue
MessagingService__DeadLetterQueue=splitzy-beta.dead-letter-queue
MessagingService__MaxRetryCount=3
MessagingService__RetryDelayTimeoutSeconds=30
Email__Host=smtp.invalid
Email__Address=beta@invalid
Email__Token=disabled
EOF
chmod 600 ~/splitzy-beta.env
grep -E 'Database=|Queue=' ~/splitzy-beta.env    # only splitzy_beta and splitzy-beta.* allowed
```

Beta uses its own JWT keys, so production tokens don't work on beta and vice versa.

### 6. Start the containers

```bash
podman run -d --name splitzy-api-beta --network splitzy --network cloudflare \
  --env-file ~/splitzy-beta.env --restart unless-stopped localhost/splitzy-api:beta
podman logs -f splitzy-api-beta          # wait for "Starting Splitzy API...", then Ctrl+C

podman run -d --name splitzy-ui-beta --network cloudflare --restart unless-stopped localhost/splitzy-ui:beta
```

For containers to come back after a reboot (rootless Podman), once:

```bash
sudo loginctl enable-linger splitzy
systemctl --user enable --now podman-restart.service
```

### 7. Cloudflare

1. **Tunnel routes**: Zero Trust → Networks → Tunnels → (the tunnel) → Public Hostname → add two entries, path entry first:

   | Subdomain | Domain | Path | Type | URL |
   |---|---|---|---|---|
   | `splitzy-beta` | `aarshiv.xyz` | `^/(api\|health\|swagger)` | HTTP | `splitzy-api-beta:8080` |
   | `splitzy-beta` | `aarshiv.xyz` | *(empty)* | HTTP | `splitzy-ui-beta:80` |

   UI and API share one hostname, so no CORS change is needed. Use `splitzy-beta.aarshiv.xyz`, not `beta.splitzy.aarshiv.xyz`: Cloudflare's free certificate only covers one subdomain level.
2. **Access policy** (recommended): Access → Applications → Add → Self-hosted → `splitzy-beta.aarshiv.xyz` → allow only testers' emails.
3. **Google sign-in**: Google Cloud Console → the OAuth client → add `https://splitzy-beta.aarshiv.xyz` to Authorized JavaScript origins.

---

## How to test

### A. Deployment checks (after every deploy)

```bash
# API is up and reachable on the tunnel network
podman exec splitzy-ui-beta wget -qO- http://splitzy-api-beta:8080/health      # Healthy

# Migrations applied
echo 'SELECT max("MigrationId") FROM "__EFMigrationsHistory";' | sqlbeta

# Beta queues exist and the consumer is attached (main-queue: 1 consumer)
podman exec rabbit-mq rabbitmqctl list_queues -q name messages consumers | grep splitzy-beta

# No errors in the log (startup "Failed executing DbCommand" on a brand-new database is normal)
podman logs splitzy-api-beta 2>&1 | grep -E '\[(ERR|FTL)\]'

# Production untouched: same migration as before, same container
podman exec postgres sh -c 'psql -U "$POSTGRES_USER" -d splitzy -tAc "SELECT max(\"MigrationId\") FROM \"__EFMigrationsHistory\""'
```

Email errors such as `Error sending email: Name or service not known` are expected: email is disabled, and those messages end up in `splitzy-beta.dead-letter-queue`.

### B. Data checks (run after testing; every query should return no rows)

```bash
sqlbeta <<'SQL'
-- balances in every group must add up to zero
SELECT group_id, sum(net_balance) FROM group_balances GROUP BY group_id HAVING sum(net_balance) <> 0;
-- nobody is a member of the same group twice
SELECT group_id, user_id, count(*) FROM group_members GROUP BY 1, 2 HAVING count(*) > 1;
-- no duplicate emails ignoring case
SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
-- no pending legacy invites left
SELECT id, email FROM group_invites WHERE accepted = false;
SQL
```

### C. Functional checklist (in the browser at https://splitzy-beta.aarshiv.xyz)

Use a second browser or a private window for the "other user". Since email is off, verification links come from the database:

```bash
echo "SELECT u.email, 'https://splitzy-beta.aarshiv.xyz/verify-email?token=' || v.token FROM email_verifications v JOIN users u USING (user_id) WHERE NOT v.is_used ORDER BY v.id DESC LIMIT 5;" | sqlbeta
```

| # | Do | Expect |
|---|---|---|
| 1 | Log in with your normal account | Same groups, expenses and balances as production at the time of the copy |
| 2 | Open a group that had pending invites | Invited people are listed as members |
| 3 | Add a member with an email that has no account | Added straight away (no "User not found") |
| 4 | Add an expense split with that invited member | Saved; balances update for everyone |
| 5 | Add a member using an existing user's email in different case (e.g. `Bob@Example.com`) | The existing user is added, no duplicate account |
| 6 | Sign up with the invited email from step 3, then try to log in | "Please verify your email before logging in" |
| 7 | Open the verification link (query above), log in | Same account: the group and the expense from step 4 are there, with the right amount owed |
| 8 | Sign up again with that email | "Email already exists" |
| 9 | As a user who is not in the group, open `https://splitzy-beta.aarshiv.xyz/swagger`, authorize, call `GET /api/Group/GetGroupOverview/{groupId}` | `403` |
| 10 | Settle up and double-click the button | Only one settlement recorded; a payment larger than the debt is rejected |
| 11 | Edit an expense, then delete it | Balances follow the edit and return to before when deleted |
| 12 | Delete a group with unsettled balances, then a settled one | First is refused, second is deleted |
| 13 | Google sign-in (after step 7.3) with an invited Gmail address | Logs in as the invited account with its group data |
| 14 | Run the data checks (B) | No rows |

---

## Deploy new commits to `beta`

```bash
cd ~/splitzy-beta && git fetch && git reset --hard origin/beta
sed -e 's#production: false#production: true#' \
    -e "s#apiBaseUrl: '[^']*'#apiBaseUrl: 'https://splitzy-beta.aarshiv.xyz'#" \
    UI/src/environments/environment.ts > UI/src/environments/environment.prod.ts
podman build -t localhost/splitzy-api:beta backend/splitzy-dotnet && podman build -t localhost/splitzy-ui:beta UI
podman rm -f splitzy-api-beta splitzy-ui-beta
podman run -d --name splitzy-api-beta --network splitzy --network cloudflare \
  --env-file ~/splitzy-beta.env --restart unless-stopped localhost/splitzy-api:beta
podman run -d --name splitzy-ui-beta --network cloudflare --restart unless-stopped localhost/splitzy-ui:beta
```

Then run the deployment checks (A). `git reset --hard` only affects `~/splitzy-beta`; it discards the generated UI settings file, which the next line recreates.

## Refresh beta data from production

```bash
podman stop splitzy-api-beta
podman exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE splitzy_beta WITH (FORCE)" -c "CREATE DATABASE splitzy_beta OWNER splitzy_beta"'
podman exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc splitzy | pg_restore -U "$POSTGRES_USER" -d splitzy_beta --no-owner --role=splitzy_beta'
podman start splitzy-api-beta            # re-applies beta's migrations to the fresh copy
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `splitzy-api-beta` exits right after start; log shows `access to vhost '/' refused for user 'splitzy_beta'` | RabbitMQ permissions missing: run step 3 again. The API stops whenever its email consumer cannot connect. |
| Log shows `ACCESS_REFUSED` on a queue | A queue name in `~/splitzy-beta.env` doesn't start with `splitzy-beta.` |
| Log shows a migration error | Production is unaffected. Send the log; after a fix, refresh beta data and redeploy. |
| Cloudflare `502 Bad Gateway` | Container not running, or not on the `cloudflare` network, or a typo in the tunnel URL |
| Logged out after a few minutes | Open beta over `https://splitzy-beta.aarshiv.xyz` (the refresh cookie needs HTTPS) |
| Google sign-in `origin_mismatch` | Add the beta URL to the OAuth client (step 7.3) |
| Beta images vanished | A production `image prune` removed them while beta containers were stopped: rebuild (step 4) |

## Remove beta

```bash
podman rm -f splitzy-api-beta splitzy-ui-beta
podman rmi localhost/splitzy-api:beta localhost/splitzy-ui:beta
podman exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE splitzy_beta WITH (FORCE)" -c "DROP ROLE splitzy_beta"'
for q in splitzy-beta.main-queue splitzy-beta.retry-queue splitzy-beta.dead-letter-queue; do podman exec rabbit-mq rabbitmqctl delete_queue "$q"; done
podman exec rabbit-mq rabbitmqctl delete_user splitzy_beta
rm -rf ~/splitzy-beta ~/splitzy-beta.env ~/.splitzy-beta-pw
```

Then delete the two `splitzy-beta` tunnel hostnames (and the Access application) in Cloudflare.

## Promote beta to production

1. Back up production: `podman exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc splitzy' > ~/splitzy_pre_release.dump`
2. Open a pull request from `beta` to `main` (list the issues it closes, e.g. `Closes #155`). CI builds and tests it.
3. Merge. The push to `main` builds `latest` and deploys production; its migrations run on startup.
4. After the deploy, run the deployment and data checks against production (`-d splitzy`).
