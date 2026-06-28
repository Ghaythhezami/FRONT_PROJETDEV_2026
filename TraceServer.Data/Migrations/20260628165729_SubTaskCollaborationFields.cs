using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgileAi.Data.Migrations
{
    public partial class SubTaskCollaborationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssigneeId",
                table: "SubTasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "SubTasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "SubTasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubTaskId",
                table: "Comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubTaskId",
                table: "Attachments",
                type: "uuid",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssigneeId",
                table: "SubTasks");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "SubTasks");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "SubTasks");

            migrationBuilder.DropColumn(
                name: "SubTaskId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "SubTaskId",
                table: "Attachments");
        }
    }
}
