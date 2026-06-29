using AgileAi.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
namespace AgileAi.Data.Context
{
    public class AppDbContext : DbContext
    {
        private static readonly Guid SeedAdminUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly DateTime SeedAdminRefreshTokenExpiryTime = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }


        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }

        public DbSet<Epic> Epics { get; set; }
        public DbSet<Sprint> Sprints { get; set; }
        public DbSet<UserStory> UserStories { get; set; }
        public DbSet<AcceptanceCriterion> AcceptanceCriteria { get; set; }

        public DbSet<Issue> Issues { get; set; }
        public DbSet<SubTask> SubTasks { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Attachment> Attachments { get; set; }
        public DbSet<KanbanColumn> KanbanColumns { get; set; }

        public DbSet<ScrumCeremony> ScrumCeremonies { get; set; }
        public DbSet<AIPredictionLog> AIPredictionLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<PushSubscription> PushSubscriptions { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProjectMember>()
                .HasKey(pm => new { pm.ProjectId, pm.MemberId });

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Member)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.MemberId)
                .OnDelete(DeleteBehavior.Restrict);





            modelBuilder.Entity<UserStory>()
                .HasOne(us => us.Epic)
                .WithMany(e => e.UserStories)
                .HasForeignKey(us => us.EpicId)
                .OnDelete(DeleteBehavior.Cascade);

            // 2. UserStory -> Sprint (Secondary Path - Fixes the Cycle)
            modelBuilder.Entity<UserStory>()
                .HasOne(us => us.Sprint)
                .WithMany(s => s.UserStories)
                .HasForeignKey(us => us.SprintId)
                .OnDelete(DeleteBehavior.NoAction);




            modelBuilder.Entity<Issue>()
                .HasOne(i => i.UserStory)
                .WithMany(us => us.Issues)
                .HasForeignKey(i => i.UserStoryId)
                .OnDelete(DeleteBehavior.Cascade);






            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Issue)
                .WithMany(i => i.Comments)
                .HasForeignKey(c => c.IssueId);

            modelBuilder.Entity<Attachment>()
                .HasOne(a => a.Issue)
                .WithMany(i => i.Attachments)
                .HasForeignKey(a => a.IssueId);





            modelBuilder.Entity<User>().HasQueryFilter(u => !u.isDeleted);
            modelBuilder.Entity<Project>().HasQueryFilter(p => !p.isDeleted);
            modelBuilder.Entity<ProjectMember>().HasQueryFilter(pm => !pm.isDeleted);
            modelBuilder.Entity<Comment>().HasQueryFilter(c => !c.isDeleted);
            modelBuilder.Entity<KanbanColumn>().HasQueryFilter(c => !c.isDeleted);
            modelBuilder.Entity<Attachment>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<AcceptanceCriterion>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<Epic>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<Sprint>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<UserStory>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<Issue>().HasQueryFilter(a => !a.isDeleted);
            modelBuilder.Entity<ActivityLog>().HasQueryFilter(a => !a.isDeleted);
            



            modelBuilder.Entity<Project>()
                .HasIndex(p => p.Key)
                .IsUnique();

            modelBuilder.Entity<PushSubscription>()
                .HasIndex(ps => new { ps.UserId, ps.Endpoint })
                .IsUnique();

            modelBuilder.Entity<PushSubscription>()
                .HasOne(ps => ps.User)
                .WithMany()
                .HasForeignKey(ps => ps.UserId)
                .OnDelete(DeleteBehavior.Cascade);

             modelBuilder.Entity<User>().HasData(
     new User
     {
        UserId = SeedAdminUserId,
         Nom = "Jeribi",
         Prenom = "Mohamed",
         Email = "mohamed.jeribi.30@gmail.com",
        MotDePasse = "AQAAAAEAACcQAAAAEAARIjNEVWZ3iJmqu8zd7v8uOpqe4rVzG1BMPfH4KwfnAeX/C/EDxjb3T6oRERGwSQ==",
         Telephone = "29500107",
         Role = "admin",
         RefreshToken = null,
        RefreshTokenExpiryTime = SeedAdminRefreshTokenExpiryTime,
         Token = null,
         isDeleted = false
     });
        }
    }

}
