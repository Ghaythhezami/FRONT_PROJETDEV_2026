using System;
using System.Collections.Generic;
using System.Linq;
using AgileAi.Data.Context;
using AgileAi.Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgileAi.Api.Services
{
    /// <summary>
    /// Seeds realistic demo data for local testing (users, projects, sprints, issues, notifications).
    /// Idempotent — each project is seeded once by key; user profiles are refreshed on every run.
    /// </summary>
    public static class DevDataSeeder
    {
        public const string DemoPassword = "AgileDev@2026!";
        public const string AdminPassword = "AgileAdmin@2026!";

        private static readonly Guid AdminId = Guid.Parse("a0000001-0000-4000-8000-000000000001");
        private static readonly Guid PoId = Guid.Parse("a0000005-0000-4000-8000-000000000001");
        private static readonly Guid ScrumMasterId = Guid.Parse("a0000006-0000-4000-8000-000000000001");
        private static readonly Guid TesterId = Guid.Parse("a0000007-0000-4000-8000-000000000001");
        private static readonly Guid GhaythId = Guid.Parse("a0000002-0000-4000-8000-000000000001");
        private static readonly Guid FerdaouesId = Guid.Parse("a0000003-0000-4000-8000-000000000001");
        private static readonly Guid ChaimaId = Guid.Parse("a0000004-0000-4000-8000-000000000001");

        public static void Seed(AppDbContext db, PasswordHasher<User> hasher)
        {
            var adminId = EnsureUser(db, hasher, AdminId, "Jeribi", "Mohamed", "admin@agileai.com", "admin", "HQ", AdminPassword);
            var poId = EnsureUser(db, hasher, PoId, "Ben", "Salma", "salma.ben@agileai.com", "po", "HQ", DemoPassword);
            var scrumMasterId = EnsureUser(db, hasher, ScrumMasterId, "Mansour", "Yassine", "yassine.mansour@agileai.com", "scrum master", "HQ", DemoPassword);
            var testerId = EnsureUser(db, hasher, TesterId, "Trabelsi", "Amine", "amine.trabelsi@agileai.com", "tester", "QA", DemoPassword);
            var ghaythId = EnsureUser(db, hasher, GhaythId, "khezami", "Ghayth", "ghayth.khezami@agileai.com", "developer", "DEV", DemoPassword);
            var ferdaouesId = EnsureUser(db, hasher, FerdaouesId, "belhadi", "ferdaoues", "ferdaoues.belhadi@agileai.com", "developer", "DEV", DemoPassword);
            var chaimaId = EnsureUser(db, hasher, ChaimaId, "Zitoun", "Chaima", "chaima.zitoun@agileai.com", "developer", "DEV", DemoPassword);

            db.SaveChanges();

            var devIds = new[] { ghaythId, ferdaouesId, chaimaId, testerId };
            var staffIds = new[] { adminId, poId, scrumMasterId };

            SeedAgilePlatform(db, staffIds, devIds);
            SeedMobileBanking(db, staffIds, devIds);
            SeedAnalyticsHub(db, staffIds, devIds);
            SeedExtendedPortfolio(db, staffIds, devIds);

            SeedProjectNotifications(db, adminId, devIds);
            db.SaveChanges();
        }

        private static void SeedAgilePlatform(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "AGILE";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000001-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000001-0000-4000-8000-000000000001");
            var sprintClosedId = Guid.Parse("d0000001-0000-4000-8000-000000000001");
            var sprintActiveId = Guid.Parse("d0000002-0000-4000-8000-000000000002");

            AddProject(db, projectId, "Agile AI Platform",
                "End-to-end agile delivery workspace with AI-assisted planning and sprint execution.",
                key, staffIds[0], now.AddDays(-30));

            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Core product delivery",
                Description = "Authentication, backlog, sprint board, and AI assistant features.",
                ProjectId = projectId,
            });

            var sprintClosed = AddSprint(db, sprintClosedId, "Sprint 1 — Foundation", projectId,
                now.AddDays(-28), now.AddDays(-14), ItemStatus.Closed, 21);
            var sprintActive = AddSprint(db, sprintActiveId, "Sprint 2 — Board & AI", projectId,
                now.AddDays(-7), now.AddDays(7), ItemStatus.InProgress, 8);

            var storyAuth = AddStory(db, "User authentication flow", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyBoard = AddStory(db, "Kanban sprint board", 8, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyAi = AddStory(db, "AI subtask suggestions", 5, epicId, sprintActive.SprintId, SprintStatus.Todo);
            var storyBacklog = AddStory(db, "Product backlog management", 3, epicId, null, SprintStatus.Todo);

            var issue1 = AddIssue(db, "Implement JWT login", ItemStatus.Done, 0, storyAuth.UserStoryId, devIds[0]);
            var issue2 = AddIssue(db, "Add role-based guards", ItemStatus.InProgress, 1, storyAuth.UserStoryId, devIds[1]);
            var issue3 = AddIssue(db, "Design kanban card layout", ItemStatus.Review, 0, storyBoard.UserStoryId, devIds[2]);
            var issue4 = AddIssue(db, "Optimistic drag-and-drop", ItemStatus.InProgress, 1, storyBoard.UserStoryId, devIds[0]);
            var issue5 = AddIssue(db, "Wire AI subtask endpoint", ItemStatus.Todo, 0, storyAi.UserStoryId, devIds[1]);
            var issue6 = AddIssue(db, "Paginated backlog list", ItemStatus.Todo, 0, storyBacklog.UserStoryId, staffIds[0]);

            AddSubTask(db, issue1.IssueId, "Validate credentials", true, devIds[0], now.AddDays(-5), now.AddDays(-3));
            AddSubTask(db, issue1.IssueId, "Store refresh token", true, devIds[0], now.AddDays(-4), now.AddDays(-2));
            AddSubTask(db, issue2.IssueId, "Admin route guard", false, devIds[1], now.AddDays(-2), now.AddDays(2));
            AddSubTask(db, issue3.IssueId, "Assignee avatars", false, devIds[2], now.AddDays(-1), now.AddDays(3));
            AddSubTask(db, issue4.IssueId, "Suppress SignalR flash reload", false, devIds[0], now, now.AddDays(4));

            AddComment(db, issue2.IssueId, devIds[0], "Please align guard logic with backend policies.");
            AddComment(db, issue3.IssueId, devIds[2], "Card mockup matches Jira-style reference.");
            AddComment(db, issue4.IssueId, devIds[0], "Optimistic update looks smooth now.");
        }

        private static void SeedMobileBanking(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "MOBL";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000002-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000002-0000-4000-8000-000000000001");
            var sprintActiveId = Guid.Parse("d0000003-0000-4000-8000-000000000003");

            AddProject(db, projectId, "Mobile Banking App",
                "Native iOS and Android banking experience with biometric login and push alerts.",
                key, staffIds[0], now.AddDays(-20));

            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Mobile release MVP",
                Description = "Account overview, transfers, and secure notifications.",
                ProjectId = projectId,
            });

            var sprintActive = AddSprint(db, sprintActiveId, "Sprint 1 — Mobile MVP", projectId,
                now.AddDays(-5), now.AddDays(9), ItemStatus.InProgress, 5);

            var storyLogin = AddStory(db, "Biometric login", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyTransfer = AddStory(db, "Instant transfers", 8, epicId, sprintActive.SprintId, SprintStatus.Todo);
            var storyPush = AddStory(db, "Push notification center", 3, epicId, sprintActive.SprintId, SprintStatus.Todo);

            var issue1 = AddIssue(db, "Face ID integration", ItemStatus.InProgress, 0, storyLogin.UserStoryId, devIds[0]);
            var issue2 = AddIssue(db, "Transfer confirmation screen", ItemStatus.Todo, 0, storyTransfer.UserStoryId, devIds[1]);
            var issue3 = AddIssue(db, "Notification badge on home", ItemStatus.Todo, 0, storyPush.UserStoryId, devIds[2]);

            AddSubTask(db, issue1.IssueId, "iOS LocalAuthentication", false, devIds[0], now.AddDays(-1), now.AddDays(5));
            AddSubTask(db, issue1.IssueId, "Android BiometricPrompt", false, devIds[0], now, now.AddDays(6));
            AddComment(db, issue1.IssueId, devIds[0], "Biometric flow works on test devices.");
        }

        private static void SeedAnalyticsHub(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "DATA";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000003-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000003-0000-4000-8000-000000000001");
            var sprintClosedId = Guid.Parse("d0000004-0000-4000-8000-000000000004");
            var sprintActiveId = Guid.Parse("d0000005-0000-4000-8000-000000000005");

            AddProject(db, projectId, "Analytics Dashboard",
                "Executive KPIs, burndown charts, and team velocity for delivery insights.",
                key, staffIds[0], now.AddDays(-45));

            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Reporting suite",
                Description = "Dashboard widgets, exports, and scheduled reports.",
                ProjectId = projectId,
            });

            AddSprint(db, sprintClosedId, "Sprint 1 — KPI widgets", projectId,
                now.AddDays(-35), now.AddDays(-21), ItemStatus.Closed, 13);

            var sprintActive = AddSprint(db, sprintActiveId, "Sprint 2 — Velocity charts", projectId,
                now.AddDays(-3), now.AddDays(11), ItemStatus.InProgress, 3);

            var storyKpi = AddStory(db, "Executive KPI cards", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyVelocity = AddStory(db, "Velocity trend chart", 5, epicId, sprintActive.SprintId, SprintStatus.Todo);

            AddIssue(db, "Wire dashboard KPI API", ItemStatus.InProgress, 0, storyKpi.UserStoryId, devIds[2]);
            AddIssue(db, "Chart.js velocity widget", ItemStatus.Todo, 0, storyVelocity.UserStoryId, devIds[1]);
            AddIssue(db, "Export CSV for sprints", ItemStatus.Review, 0, storyVelocity.UserStoryId, devIds[0]);
        }

        private static void SeedExtendedPortfolio(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            SeedHrManagement(db, staffIds, devIds);
            SeedECommercePortal(db, staffIds, devIds);
            SeedIotMonitoring(db, staffIds, devIds);
            SeedCustomerCrm(db, staffIds, devIds);
            SeedSecurityAudit(db, staffIds, devIds);
            SeedDocumentManager(db, staffIds, devIds);
            SeedApiGateway(db, staffIds, devIds);
        }

        private static void SeedHrManagement(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "HRMS";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000004-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000004-0000-4000-8000-000000000001");

            AddProject(db, projectId, "HR Management Suite",
                "Employee onboarding, leave requests, and payroll integration.",
                key, staffIds[1], now.AddDays(-60));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "People operations",
                Description = "Core HR workflows and employee self-service.",
                ProjectId = projectId,
            });

            var sprintClosed = AddSprint(db, Guid.Parse("d0000006-0000-4000-8000-000000000006"),
                "Sprint 1 — Onboarding", projectId, now.AddDays(-55), now.AddDays(-41), ItemStatus.Closed, 18);
            var sprintActive = AddSprint(db, Guid.Parse("d0000007-0000-4000-8000-000000000007"),
                "Sprint 2 — Leave module", projectId, now.AddDays(-10), now.AddDays(4), ItemStatus.InProgress, 6);

            var storyOnboard = AddStory(db, "Digital onboarding checklist", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyLeave = AddStory(db, "Leave request workflow", 8, epicId, sprintActive.SprintId, SprintStatus.Todo);
            AddStory(db, "Payroll export", 3, epicId, sprintClosed.SprintId, SprintStatus.Done);

            AddIssue(db, "Employee profile wizard", ItemStatus.InProgress, 0, storyOnboard.UserStoryId, devIds[0]);
            AddIssue(db, "Manager approval queue", ItemStatus.Todo, 0, storyLeave.UserStoryId, devIds[2]);
            AddIssue(db, "Holiday balance widget", ItemStatus.Review, 1, storyLeave.UserStoryId, devIds[1]);
        }

        private static void SeedECommercePortal(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "ECOM";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000005-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000005-0000-4000-8000-000000000001");

            AddProject(db, projectId, "E-Commerce Portal",
                "B2C storefront with catalog, cart, and order tracking.",
                key, staffIds[2], now.AddDays(-90));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Online sales channel",
                Description = "Product discovery through checkout and fulfillment.",
                ProjectId = projectId,
            });

            AddSprint(db, Guid.Parse("d0000008-0000-4000-8000-000000000008"),
                "Sprint 1 — Catalog MVP", projectId, now.AddDays(-80), now.AddDays(-66), ItemStatus.Closed, 25);
            AddSprint(db, Guid.Parse("d0000009-0000-4000-8000-000000000009"),
                "Sprint 2 — Cart & checkout", projectId, now.AddDays(-50), now.AddDays(-36), ItemStatus.Closed, 21);
            var sprintActive = AddSprint(db, Guid.Parse("d000000a-0000-4000-8000-00000000000a"),
                "Sprint 3 — Order tracking", projectId, now.AddDays(-12), now.AddDays(2), ItemStatus.InProgress, 9);
            AddSprint(db, Guid.Parse("d000000b-0000-4000-8000-00000000000b"),
                "Sprint 4 — Promotions", projectId, now.AddDays(5), now.AddDays(19), ItemStatus.Todo, 0);

            var storyOrders = AddStory(db, "Real-time order status", 8, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyPromo = AddStory(db, "Coupon engine", 5, epicId, null, SprintStatus.Todo);

            AddIssue(db, "Shipment timeline component", ItemStatus.InProgress, 0, storyOrders.UserStoryId, devIds[1]);
            AddIssue(db, "Email order updates", ItemStatus.Todo, 1, storyOrders.UserStoryId, devIds[3]);
            AddIssue(db, "Percentage discount rules", ItemStatus.Todo, 0, storyPromo.UserStoryId, devIds[0]);
        }

        private static void SeedIotMonitoring(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "IOT";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000006-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000006-0000-4000-8000-000000000001");

            AddProject(db, projectId, "IoT Monitoring Platform",
                "Sensor ingestion, alerting, and device fleet dashboards.",
                key, staffIds[0], now.AddDays(-40));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Connected devices",
                Description = "Telemetry pipeline and operational alerts.",
                ProjectId = projectId,
            });

            var sprintClosed = AddSprint(db, Guid.Parse("d000000c-0000-4000-8000-00000000000c"),
                "Sprint 1 — Device registry", projectId, now.AddDays(-38), now.AddDays(-24), ItemStatus.Closed, 15);
            var sprintActive = AddSprint(db, Guid.Parse("d000000d-0000-4000-8000-00000000000d"),
                "Sprint 2 — Alert rules", projectId, now.AddDays(-6), now.AddDays(8), ItemStatus.InProgress, 4);

            var storyAlerts = AddStory(db, "Threshold alert engine", 8, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            AddStory(db, "Device provisioning API", 5, epicId, sprintClosed.SprintId, SprintStatus.Done);

            AddIssue(db, "MQTT ingestion worker", ItemStatus.Review, 0, storyAlerts.UserStoryId, devIds[2]);
            AddIssue(db, "Slack alert integration", ItemStatus.InProgress, 1, storyAlerts.UserStoryId, devIds[0]);
        }

        private static void SeedCustomerCrm(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "CRM";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000007-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000007-0000-4000-8000-000000000001");

            AddProject(db, projectId, "Customer CRM",
                "Lead pipeline, account history, and support tickets.",
                key, staffIds[1], now.AddDays(-75));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Customer 360",
                Description = "Unified view of leads, accounts, and interactions.",
                ProjectId = projectId,
            });

            AddSprint(db, Guid.Parse("d000000e-0000-4000-8000-00000000000e"),
                "Sprint 1 — Lead capture", projectId, now.AddDays(-70), now.AddDays(-56), ItemStatus.Closed, 20);
            var sprintActive = AddSprint(db, Guid.Parse("d000000f-0000-4000-8000-00000000000f"),
                "Sprint 2 — Pipeline board", projectId, now.AddDays(-20), now.AddDays(-6), ItemStatus.InProgress, 11);
            AddSprint(db, Guid.Parse("d0000010-0000-4000-8000-000000000010"),
                "Sprint 3 — Support desk", projectId, now.AddDays(-2), now.AddDays(12), ItemStatus.InProgress, 3);

            var storyPipeline = AddStory(db, "Sales pipeline kanban", 8, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storySupport = AddStory(db, "Ticket assignment", 5, epicId, Guid.Parse("d0000010-0000-4000-8000-000000000010"), SprintStatus.Todo);

            AddIssue(db, "Deal stage transitions", ItemStatus.InProgress, 0, storyPipeline.UserStoryId, devIds[3]);
            AddIssue(db, "Contact activity timeline", ItemStatus.Done, 1, storyPipeline.UserStoryId, devIds[1]);
            AddIssue(db, "Agent workload view", ItemStatus.Todo, 0, storySupport.UserStoryId, devIds[2]);
        }

        private static void SeedSecurityAudit(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "SEC";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000008-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000008-0000-4000-8000-000000000001");

            AddProject(db, projectId, "Security Audit Toolkit",
                "Vulnerability scans, compliance reports, and access reviews.",
                key, staffIds[0], now.AddDays(-25));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Compliance automation",
                Description = "Automated checks and audit trail exports.",
                ProjectId = projectId,
            });

            var sprintClosed = AddSprint(db, Guid.Parse("d0000011-0000-4000-8000-000000000011"),
                "Sprint 1 — Scan runner", projectId, now.AddDays(-22), now.AddDays(-8), ItemStatus.Closed, 14);
            var sprintActive = AddSprint(db, Guid.Parse("d0000012-0000-4000-8000-000000000012"),
                "Sprint 2 — Access review", projectId, now.AddDays(-4), now.AddDays(10), ItemStatus.InProgress, 5);

            var storyAccess = AddStory(db, "Quarterly access review", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            AddStory(db, "OWASP scan integration", 8, epicId, sprintClosed.SprintId, SprintStatus.Done);

            AddIssue(db, "Role diff report", ItemStatus.InProgress, 0, storyAccess.UserStoryId, devIds[0]);
            AddIssue(db, "Export audit PDF", ItemStatus.Todo, 1, storyAccess.UserStoryId, devIds[3]);
        }

        private static void SeedDocumentManager(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "DOC";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b0000009-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c0000009-0000-4000-8000-000000000001");

            AddProject(db, projectId, "Document Manager",
                "Versioned file storage, approvals, and full-text search.",
                key, staffIds[2], now.AddDays(-100));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Enterprise documents",
                Description = "Secure repository with workflow approvals.",
                ProjectId = projectId,
            });

            AddSprint(db, Guid.Parse("d0000013-0000-4000-8000-000000000013"),
                "Sprint 1 — Upload & versions", projectId, now.AddDays(-95), now.AddDays(-81), ItemStatus.Closed, 22);
            AddSprint(db, Guid.Parse("d0000014-0000-4000-8000-000000000014"),
                "Sprint 2 — Full-text search", projectId, now.AddDays(-60), now.AddDays(-46), ItemStatus.Closed, 17);
            var sprintActive = AddSprint(db, Guid.Parse("d0000015-0000-4000-8000-000000000015"),
                "Sprint 3 — Approval flow", projectId, now.AddDays(-8), now.AddDays(6), ItemStatus.InProgress, 7);
            AddSprint(db, Guid.Parse("d0000016-0000-4000-8000-000000000016"),
                "Sprint 4 — Retention policies", projectId, now.AddDays(8), now.AddDays(22), ItemStatus.Todo, 0);

            var storyApproval = AddStory(db, "Multi-step approval", 8, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyRetention = AddStory(db, "Auto-archive rules", 5, epicId, null, SprintStatus.Todo);

            AddIssue(db, "Reviewer notification emails", ItemStatus.InProgress, 0, storyApproval.UserStoryId, devIds[1]);
            AddIssue(db, "Reject with comments", ItemStatus.Review, 1, storyApproval.UserStoryId, devIds[2]);
            AddIssue(db, "Retention schedule UI", ItemStatus.Todo, 0, storyRetention.UserStoryId, devIds[0]);
        }

        private static void SeedApiGateway(AppDbContext db, Guid[] staffIds, Guid[] devIds)
        {
            const string key = "API";
            if (db.Projects.Any(p => p.Key == key))
            {
                return;
            }

            var now = DateTime.UtcNow;
            var projectId = Guid.Parse("b000000a-0000-4000-8000-000000000001");
            var epicId = Guid.Parse("c000000a-0000-4000-8000-000000000001");

            AddProject(db, projectId, "API Gateway",
                "Central routing, rate limiting, and API key management.",
                key, staffIds[0], now.AddDays(-15));
            AddMembers(db, projectId, staffIds, devIds);

            db.Epics.Add(new Epic
            {
                EpicId = epicId,
                Title = "Platform APIs",
                Description = "Unified gateway for internal microservices.",
                ProjectId = projectId,
            });

            AddSprint(db, Guid.Parse("d0000017-0000-4000-8000-000000000017"),
                "Sprint 1 — Routing core", projectId, now.AddDays(-14), now.AddDays(-7), ItemStatus.Closed, 10);
            var sprintActive = AddSprint(db, Guid.Parse("d0000018-0000-4000-8000-000000000018"),
                "Sprint 2 — Rate limits", projectId, now.AddDays(-5), now.AddDays(9), ItemStatus.InProgress, 4);
            AddSprint(db, Guid.Parse("d0000019-0000-4000-8000-000000000019"),
                "Sprint 3 — API keys", projectId, now.AddDays(10), now.AddDays(24), ItemStatus.Todo, 0);

            var storyRate = AddStory(db, "Per-client rate limiting", 5, epicId, sprintActive.SprintId, SprintStatus.InProgress);
            var storyKeys = AddStory(db, "API key rotation", 8, epicId, null, SprintStatus.Todo);

            AddIssue(db, "Redis token bucket", ItemStatus.InProgress, 0, storyRate.UserStoryId, devIds[0]);
            AddIssue(db, "429 response handler", ItemStatus.Todo, 1, storyRate.UserStoryId, devIds[1]);
            AddIssue(db, "Key expiry scheduler", ItemStatus.Todo, 0, storyKeys.UserStoryId, devIds[2]);
        }

        private static void SeedProjectNotifications(AppDbContext db, Guid adminId, Guid[] devIds)
        {
            var projects = db.Projects.ToList();

            foreach (var project in projects)
            {
                foreach (var devId in devIds)
                {
                    var marker = $"[{project.Key}]";
                    if (db.Notifications.Any(n => n.ReceiverId == devId && n.Message.Contains(marker)))
                    {
                        continue;
                    }

                    db.Notifications.Add(new Notification
                    {
                        NotificationId = Guid.NewGuid(),
                        ReceiverId = devId,
                        Message = $"{marker} You were assigned to {project.ProjectName}. Check the sprint board for open tasks.",
                        Link = $"/projects/{project.ProjectId}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-2),
                    });
                }

                if (!db.Notifications.Any(n => n.ReceiverId == adminId && n.Message.Contains($"[{project.Key}]")))
                {
                    db.Notifications.Add(new Notification
                    {
                        NotificationId = Guid.NewGuid(),
                        ReceiverId = adminId,
                        Message = $"[{project.Key}] Project {project.ProjectName} is active with a running sprint.",
                        Link = $"/projects/{project.ProjectId}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-1),
                    });
                }
            }
        }

        private static void AddProject(
            AppDbContext db,
            Guid projectId,
            string name,
            string description,
            string key,
            Guid ownerId,
            DateTime createdAt)
        {
            if (!UserExists(db, ownerId))
            {
                return;
            }

            db.Projects.Add(new Project
            {
                ProjectId = projectId,
                ProjectName = name,
                ProjectDescription = description,
                Key = key,
                OwnerId = ownerId,
                CreatedAt = createdAt,
                UpdatedAt = DateTime.UtcNow,
                IsFinished = false,
            });
        }

        private static void AddMembers(AppDbContext db, Guid projectId, IEnumerable<Guid> staffIds, IEnumerable<Guid> devIds)
        {
            var memberIds = staffIds.Concat(devIds).Distinct();
            foreach (var memberId in memberIds)
            {
                if (!UserExists(db, memberId))
                {
                    continue;
                }

                if (db.ProjectMembers.IgnoreQueryFilters().Any(pm => pm.ProjectId == projectId && pm.MemberId == memberId))
                {
                    continue;
                }

                db.ProjectMembers.Add(new ProjectMember
                {
                    ProjectMemberId = Guid.NewGuid(),
                    ProjectId = projectId,
                    MemberId = memberId,
                    isDeleted = false,
                });
            }
        }

        private static bool UserExists(AppDbContext db, Guid userId) =>
            db.Users.IgnoreQueryFilters().Any(u => u.UserId == userId && !u.isDeleted);

        private static Sprint AddSprint(
            AppDbContext db,
            Guid sprintId,
            string name,
            Guid projectId,
            DateTime start,
            DateTime end,
            ItemStatus status,
            int completedPoints)
        {
            var sprint = new Sprint
            {
                SprintId = sprintId,
                Name = name,
                StartDate = start,
                EndDate = end,
                Status = status,
                ProjectId = projectId,
                CompletedPoints = completedPoints,
            };
            db.Sprints.Add(sprint);
            return sprint;
        }

        private static Guid EnsureUser(
            AppDbContext db,
            PasswordHasher<User> hasher,
            Guid id,
            string nom,
            string prenom,
            string email,
            string role,
            string filiale,
            string password = DemoPassword)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var existing = db.Users.IgnoreQueryFilters()
                .FirstOrDefault(u => u.Email != null && u.Email.ToLower() == normalizedEmail);

            if (existing != null)
            {
                existing.Nom = nom;
                existing.Prenom = prenom;
                existing.Role = role;
                existing.Filiale = filiale;
                existing.isDeleted = false;
                if (!string.IsNullOrWhiteSpace(password))
                {
                    existing.MotDePasse = hasher.HashPassword(existing, password);
                }
                return existing.UserId;
            }

            var byId = db.Users.IgnoreQueryFilters().FirstOrDefault(u => u.UserId == id);
            if (byId != null)
            {
                byId.Nom = nom;
                byId.Prenom = prenom;
                byId.Email = email;
                byId.Role = role;
                byId.Filiale = filiale;
                byId.isDeleted = false;
                byId.MotDePasse = hasher.HashPassword(byId, password);
                return byId.UserId;
            }

            var user = new User
            {
                UserId = id,
                Nom = nom,
                Prenom = prenom,
                Email = email,
                Telephone = "0600000000",
                Role = role,
                Filiale = filiale,
                isDeleted = false,
            };
            user.MotDePasse = hasher.HashPassword(user, password);
            db.Users.Add(user);
            return id;
        }

        private static UserStory AddStory(
            AppDbContext db,
            string title,
            int points,
            Guid epicId,
            Guid? sprintId,
            SprintStatus status)
        {
            var story = new UserStory
            {
                UserStoryId = Guid.NewGuid(),
                Title = title,
                Description = $"Deliver {title.ToLower()} for the platform.",
                StoryPoints = points,
                Priority = ItemPriority.Medium,
                MoSCoW = MoSCoW.Should,
                EpicId = epicId,
                SprintId = sprintId,
                Status = status,
            };
            db.UserStories.Add(story);
            return story;
        }

        private static Issue AddIssue(
            AppDbContext db,
            string title,
            ItemStatus status,
            int order,
            Guid storyId,
            Guid assigneeId)
        {
            var issue = new Issue
            {
                IssueId = Guid.NewGuid(),
                Title = title,
                Status = status,
                Order = order,
                UserStoryId = storyId,
                AssigneeId = assigneeId,
            };
            db.Issues.Add(issue);
            return issue;
        }

        private static void AddSubTask(
            AppDbContext db,
            Guid issueId,
            string title,
            bool completed,
            Guid? assigneeId = null,
            DateTime? startDate = null,
            DateTime? dueDate = null)
        {
            db.SubTasks.Add(new SubTask
            {
                SubTaskId = Guid.NewGuid(),
                Title = title,
                IsCompleted = completed,
                IssueId = issueId,
                AssigneeId = assigneeId,
                StartDate = ToUtc(startDate),
                DueDate = ToUtc(dueDate),
            });
        }

        private static DateTime? ToUtc(DateTime? value)
        {
            if (!value.HasValue)
            {
                return null;
            }

            var date = value.Value;
            return date.Kind == DateTimeKind.Utc
                ? date
                : DateTime.SpecifyKind(date, DateTimeKind.Utc);
        }

        private static void AddComment(AppDbContext db, Guid issueId, Guid authorId, string content)
        {
            db.Comments.Add(new Comment
            {
                CommentId = Guid.NewGuid(),
                IssueId = issueId,
                AuthorId = authorId,
                Content = content,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }
}
