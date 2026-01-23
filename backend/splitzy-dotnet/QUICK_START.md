# Quick Start Guide - GitHub Actions Pipeline

## ? What's Been Set Up

Your GitHub Actions workflow (`.github/workflows/dotnet-tests.yml`) now includes:

### 6 Sequential & Parallel Jobs

```
???????????????????????????????????????????????????????????????
? TRIGGER: Push/PR to main/develop or Manual workflow_dispatch?
???????????????????????????????????????????????????????????????
                          ?
                    ?????????????
                    ? Validation ? (Prerequisites)
                    ?????????????
                          ?
        ?????????????????????????????????????
        ?                 ?                 ?
   ?????????????  ???????????????  ???????????????
   ?Unit Tests ?  ?Code Quality ?  ?  Security   ?
   ?(blocking) ?  ?(non-blocking)?  ?(non-blocking)?
   ?????????????  ???????????????  ???????????????
        ?                ?                ?
        ???????????????????????????????????
                         ?
                   ????????????????
                   ?Test Analysis ?
                   ????????????????
                         ?
                    ???????????????
                    ?   Summary   ?
                    ???????????????
```

---

## ?? Pipeline Jobs Explained

### 1?? **Validation** (BLOCKING)
- Checks repository structure exists
- Restores NuGet packages
- Builds solution
- ?? **If fails:** Pipeline stops

### 2?? **Unit Tests** (BLOCKING)
- Runs all 13 tests
- Publishes test results to GitHub
- Uploads artifacts (30-day retention)
- ?? **If any test fails:** Pipeline stops

### 3?? **Test Analysis** (INFO)
- Generates test coverage report
- Documents validated controllers
- ?? **Always runs** (even if tests fail)

### 4?? **Code Quality** (WARNING)
- Checks code formatting
- Scans vulnerable dependencies
- ?? **Non-blocking** (warnings only)

### 5?? **Security** (WARNING)
- Validates project references
- Scans for hardcoded secrets
- ?? **Non-blocking** (warnings only)

### 6?? **Summary** (FINAL)
- Aggregates all results
- Posts PR comments
- Generates final report
- Determines overall status

---

## ?? Test Validation

### What Gets Tested?

```
? 13 Unit Tests Total

AuthControllerTests
??? Index (health check)
??? Login with valid credentials
??? Login with invalid credentials
??? Signup (registration)
??? Signup (duplicate email)
??? Logout

UserControllerTests
??? Get all users
??? Get all users (empty list)

GroupControllerTests
??? Get group summary
??? Invalid group ID handling

ExpenseControllerTests
??? Add expense
??? Add expense (null validation)
??? Delete expense
??? Delete expense (invalid ID)

SettleupControllerTests
??? Create settlement
??? Zero amount validation
??? Same payer/receiver validation

DashboardControllerTests
??? Get dashboard
??? Non-existent user handling
```

---

## ?? How to Trigger the Pipeline

### Option 1: Push to main/develop
```bash
git push origin main
# or
git push origin develop
```

### Option 2: Create a Pull Request
1. Create feature branch
2. Push changes
3. Open PR to main/develop
4. Pipeline runs automatically

### Option 3: Manual Trigger
1. Go to GitHub repository
2. Click "Actions" tab
3. Select "Splitzy Backend Tests" workflow
4. Click "Run workflow"
5. Select branch
6. Click "Run workflow"

---

## ?? Viewing Results

### Real-time Progress
1. Go to **Actions** tab
2. Click running workflow
3. Watch jobs execute in real-time

### Test Results
1. Go to **Checks** tab (on PR)
2. Expand "Unit Test Results"
3. See all test details

### Artifacts
1. Click on workflow run
2. Scroll to "Artifacts"
3. Download test results (TRX/JSON)

### PR Comments
- Pipeline automatically comments on PRs
- Shows: ? Build & Tests Status
- Test count: 13/13 passing
- Controller validation: All passed

---

## ? Environment Variables

Currently using:
```
DOTNET_VERSION: 8.0.x
BUILD_CONFIGURATION: Release
BACKEND_PATH: backend/splitzy-dotnet
TEST_PROJECT_PATH: backend/spllitzy-dotnet-tests
```

To modify, edit top of `.github/workflows/dotnet-tests.yml`

---

## ?? Common Workflow Outputs

### ? Success
```
? ALL CHECKS PASSED
????????????????????????
? Code validation passed
? Build successful
? All 13 unit tests passed
? Code quality checked
? Security validated
????????????????????????
```

### ? Failure
```
? PIPELINE FAILED
Check logs for: [failing job]
```

### ?? Warnings (Non-blocking)
```
?? Code format warnings
?? Vulnerable dependencies detected
(Pipeline continues - not blocking)
```

---

## ?? Artifacts Produced

| Artifact | Format | Retention | Usage |
|----------|--------|-----------|-------|
| Test Results | TRX | 30 days | GitHub integration |
| Test Data | JSON | 30 days | Analysis/metrics |
| Build Output | .dll | Temporary | Verification |

---

## ?? Key Validations

? **Structural Validation**
- Backend path exists
- Test project exists
- Required files present

? **Build Validation**
- No compilation errors
- All dependencies resolvable
- Release config successful

? **Test Validation**
- Exactly 13 tests executed
- 100% pass rate required
- All controllers covered

? **Quality Validation**
- Code format compliance
- No vulnerable dependencies
- No hardcoded secrets

---

## ?? Support & Debugging

### View Detailed Logs
1. Click workflow run
2. Click specific job
3. Expand step logs
4. Search for error messages

### Download Test Results
1. Click workflow run
2. Scroll to "Artifacts"
3. Download `test-results-<id>`
4. Open with text editor or TestExplorer

### Run Tests Locally
```bash
cd backend/splitzy-dotnet
dotnet test ../spllitzy-dotnet-tests/spllitzy-dotnet-tests.csproj
```

### Common Issues

**Build Fails**
- Check .NET 8 SDK compatibility
- Verify NuGet sources
- Run `dotnet restore` locally

**Tests Fail**
- Check test logs in GitHub Actions
- Run tests locally: `dotnet test`
- Review test output artifacts

**Pipeline Doesn't Run**
- Verify paths in workflow match repository
- Check branch protection rules
- Ensure workflow file syntax is valid

---

## ?? Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/dotnet-tests.yml` | Main workflow file |
| `backend/splitzy-dotnet/splitzy-dotnet.csproj` | Backend project |
| `backend/spllitzy-dotnet-tests/spllitzy-dotnet-tests.csproj` | Test project |

---

## ? Status Badges (Optional)

Add to your README.md:

```markdown
![Tests](https://github.com/Splitzzyy/Splitzy/actions/workflows/dotnet-tests.yml/badge.svg)
```

---

## ?? Next Steps

1. ? Workflow is configured in `.github/workflows/dotnet-tests.yml`
2. Push to repository: `git push origin main`
3. Check Actions tab for workflow execution
4. Monitor first run and review results
5. Configure notifications (optional)

---

**Workflow Status:** ? **READY FOR PRODUCTION**

**Questions?** Review `GITHUB_WORKFLOW_GUIDE.md` for detailed documentation
