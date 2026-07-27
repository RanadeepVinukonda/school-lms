import { EventBus } from '../../utils/events';

describe('EventBus', () => {
  it('emits and receives events', async () => {
    const bus = new EventBus();
    const handler = jest.fn();

    bus.on('student.enrolled', handler);
    await bus.emit('student.enrolled', { studentId: '123', classId: '456', schoolId: '789' });

    expect(handler).toHaveBeenCalledWith({ studentId: '123', classId: '456', schoolId: '789' });
  });

  it('off removes listener', async () => {
    const bus = new EventBus();
    const handler = jest.fn();

    bus.on('quiz.submitted', handler);
    bus.off('quiz.submitted', handler);
    await bus.emit('quiz.submitted', { quizId: '1', studentId: '2', attemptId: '3', score: 90, passed: true });

    expect(handler).not.toHaveBeenCalled();
  });
});
