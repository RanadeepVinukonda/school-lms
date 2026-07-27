import { logger } from './logger';

type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  async emit<T = unknown>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) return;

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`Event handler error for ${event}`, { error: String(error) });
      }
    });

    await Promise.allSettled(promises);
  }
}

export const eventBus = new EventBus();

export const DomainEvents = {
  STUDENT_ENROLLED: 'student.enrolled',
  STUDENT_UNENROLLED: 'student.unenrolled',
  QUIZ_CREATED: 'quiz.created',
  QUIZ_SUBMITTED: 'quiz.submitted',
  QUIZ_GRADES_RELEASED: 'quiz.grades_released',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_SUBMITTED: 'assignment.submitted',
  GRADE_UPDATED: 'grade.updated',
  ATTENDANCE_MARKED: 'attendance.marked',
  FEE_PAYMENT_RECORDED: 'fee.payment_recorded',
  TEXTBOOK_PROCESSING_COMPLETE: 'textbook.processing_complete',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  CLASS_STUDENTS_UPDATED: 'class.students_updated',
  INVENTORY_ITEM_UPDATED: 'inventory.item_updated',
  AI_REQUEST_COMPLETED: 'ai.request_completed',
} as const;
