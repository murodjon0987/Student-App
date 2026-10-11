import { prisma } from "@/lib/prisma";

/** Preserve account and profile, and delete all other user-owned records atomically. */
export async function deleteUserContent(userId: string, db = prisma) {
  await db.$transaction([
    db.groupReply.deleteMany({ where: { authorId: userId } }),
    db.savedOpportunity.deleteMany({ where: { userId } }),
    db.opportunity.deleteMany({ where: { userId } }),
    db.quizAttempt.deleteMany({ where: { userId } }),
    db.flashcardDeck.deleteMany({ where: { userId } }),
    db.studyPlan.deleteMany({ where: { userId } }),
    db.toolReminder.deleteMany({ where: { userId } }),
    db.groupPost.deleteMany({ where: { authorId: userId } }),
    db.groupMember.deleteMany({ where: { userId } }),
    db.studentGroup.deleteMany({ where: { ownerId: userId } }),
    db.attachment.deleteMany({ where: { userId } }),
    db.attendance.deleteMany({ where: { userId } }),
    db.task.deleteMany({ where: { userId } }),
    db.homework.deleteMany({ where: { userId } }),
    db.note.deleteMany({ where: { userId } }),
    db.exam.deleteMany({ where: { userId } }),
    db.event.deleteMany({ where: { userId } }),
    db.expense.deleteMany({ where: { userId } }),
    db.budget.deleteMany({ where: { userId } }),
    db.goal.deleteMany({ where: { userId } }),
    db.studySession.deleteMany({ where: { userId } }),
    db.notification.deleteMany({ where: { userId } }),
    db.material.deleteMany({ where: { userId } }),
    db.grade.deleteMany({ where: { userId } }),
    db.semester.deleteMany({ where: { userId } }),
    db.schedule.deleteMany({ where: { userId } }),
    db.subject.deleteMany({ where: { userId } }),
    // Messages, listing images and goal tasks are removed by their cascading relations.
    db.chat.deleteMany({ where: { userId } }),
    db.generatedImage.deleteMany({ where: { userId } }),
    db.housingFavorite.deleteMany({ where: { userId } }),
    db.housingListing.deleteMany({ where: { userId } }),
    db.pushSubscription.deleteMany({ where: { userId } }),
    db.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
}
