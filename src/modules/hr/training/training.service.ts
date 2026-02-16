import prisma from '../../../config/postgres';
import { logger, logAction } from '../../../common/utils/logger';

/**
 * TRAINING MANAGEMENT SERVICE
 */
export const trainingService = {
  async enrollTraining(data: any) {
    try {
      const training = await prisma.employeeTraining.create({
        data: {
          ...data,
          status: 'Scheduled',
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'ENROLL_TRAINING',
        performedBy: 'SYSTEM',
        targetId: training.id,
        details: {
          employeeId: data.employeeId,
          trainingName: data.trainingName,
          startDate: data.startDate,
        },
      });

      logger.info(`Employee enrolled in training: ${training.id}`);
      return training;
    } catch (error: any) {
      logger.error('Error enrolling training:', error);
      throw error;
    }
  },

  async completeTraining(id: string, data: any) {
    try {
      const training = await prisma.employeeTraining.update({
        where: { id },
        data: {
          status: 'Completed',
          completionDate: new Date(),
          ...data,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'COMPLETE_TRAINING',
        performedBy: 'SYSTEM',
        targetId: id,
        details: {
          employeeId: training.employeeId,
        },
      });

      logger.info(`Training completed: ${id}`);
      return training;
    } catch (error: any) {
      logger.error('Error completing training:', error);
      throw error;
    }
  },

  async getEmployeeTrainingHistory(employeeId: string) {
    try {
      const trainings = await prisma.employeeTraining.findMany({
        where: { employeeId },
        orderBy: { startDate: 'desc' },
      });

      return trainings;
    } catch (error: any) {
      logger.error('Error fetching training history:', error);
      throw error;
    }
  },

  async getTrainingStats(employeeId: string) {
    try {
      const trainings = await prisma.employeeTraining.findMany({
        where: { employeeId },
      });

      const completed = trainings.filter((t) => t.status === 'Completed').length;
      const inProgress = trainings.filter((t) => t.status === 'InProgress').length;
      const scheduled = trainings.filter((t) => t.status === 'Scheduled').length;

      return {
        totalTrainings: trainings.length,
        completed,
        inProgress,
        scheduled,
        averageScore: calculateAverageScore(trainings),
      };
    } catch (error: any) {
      logger.error('Error fetching training stats:', error);
      throw error;
    }
  },
};

function calculateAverageScore(trainings: any[]): number {
  const completedWithScores = trainings.filter((t) => t.assessmentScore !== null);
  if (completedWithScores.length === 0) return 0;

  const totalScore = completedWithScores.reduce((sum, t) => sum + (t.assessmentScore || 0), 0);
  return Number((totalScore / completedWithScores.length).toFixed(2));
}
