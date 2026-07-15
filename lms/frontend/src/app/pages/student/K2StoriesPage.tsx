import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface StoryPage {
  image: string;
  text: string;
}

interface Story {
  id: string;
  title: string;
  pages: StoryPage[];
  questions: { question: string; options: string[]; correctIndex: number }[];
}

export default function K2StoriesPage() {
  const { _ } = useTranslation();

  const [stories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    if (!autoAdvance || showQuestions || !selectedStory) return;
    const timer = setTimeout(() => {
      if (currentPage < selectedStory.pages.length - 1) {
        setCurrentPage((p) => p + 1);
      } else {
        setShowQuestions(true);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [autoAdvance, currentPage, showQuestions, selectedStory]);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.7;
    utterance.pitch = 1.1;
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const selectStory = (story: Story) => {
    setSelectedStory(story);
    setCurrentPage(0);
    setShowQuestions(false);
    setAnswers([]);
    setShowResults(false);
  };

  const nextPage = () => {
    if (!selectedStory) return;
    if (currentPage < selectedStory.pages.length - 1) {
      setCurrentPage((p) => p + 1);
    } else {
      setShowQuestions(true);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  };

  const answerQuestion = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setShowResults(true);
  };

  const restart = () => {
    setSelectedStory(null);
    setCurrentPage(0);
    setShowQuestions(false);
    setAnswers([]);
    setShowResults(false);
  };

  if (!selectedStory) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl p-4 shadow-lg border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-blue-700 mb-3 flex items-center gap-2"><span>📖</span> {_('Story Time')}</h2>
          {stories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-6xl block mb-4">📚</span>
              <p className="text-xl font-bold">{_('No stories available yet')}</p>
              <p className="text-sm mt-1">{_('Stories will appear here once created by your teacher.')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => {
                    selectStory(story);
                    speak(story.title);
                  }}
                  className="bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-3xl p-6 text-center shadow-lg hover:scale-105 transition-transform active:scale-95"
                >
                  <span className="text-5xl mb-2 block">{story.pages[0].image}</span>
                  <span className="text-2xl font-bold">{story.title}</span>
                  <span className="block text-sm text-white/80 mt-1">{story.pages.length} {_('pages')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showQuestions) {
    const correctCount = selectedStory.questions.filter((q, i) => answers[i] === q.correctIndex).length;
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-yellow-200">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">📝 {_('Story Quiz')}</h3>
          {selectedStory.questions.map((q, qi) => (
            <div key={qi} className="mb-4">
              <p className="text-lg font-bold text-gray-700 mb-2">{q.question}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => !showResults && answerQuestion(qi, oi)}
                    disabled={showResults}
                    className={`p-3 rounded-2xl text-lg font-bold transition-all ${
                      showResults
                        ? oi === q.correctIndex
                          ? 'bg-green-200 text-green-700 border-2 border-green-400'
                          : answers[qi] === oi
                            ? 'bg-red-200 text-red-700 border-2 border-red-400'
                            : 'bg-gray-100 text-gray-500'
                        : answers[qi] === oi
                          ? 'bg-purple-500 text-white shadow-lg'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!showResults && answers.filter((a) => a !== undefined).length === selectedStory.questions.length && (
            <button onClick={submitQuiz} className="w-full py-3 bg-green-500 text-white rounded-2xl text-xl font-bold hover:bg-green-600 transition-colors">
              ✅ {_('Submit Answers')}
            </button>
          )}
          {showResults && (
            <div className="text-center mt-4">
              <p className="text-3xl font-bold text-green-600">{correctCount}/{selectedStory.questions.length} {_('Correct!')}</p>
              {correctCount === selectedStory.questions.length && <p className="text-4xl mt-2">🎉 {_('Perfect Score!')}</p>}
              <button onClick={restart} className="mt-4 px-8 py-3 bg-blue-500 text-white rounded-2xl text-lg font-bold hover:bg-blue-600">
                📚 {_('More Stories')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const page = selectedStory.pages[currentPage];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-purple-700">{selectedStory.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{_('Page')} {currentPage + 1}/{selectedStory.pages.length}</span>
            <button onClick={() => setAutoAdvance(!autoAdvance)} className={`px-3 py-1 rounded-xl text-sm font-bold ${autoAdvance ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {autoAdvance ? '▶ ' + _('Auto') : '⏸ ' + _('Manual')}
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="text-8xl block mb-4 animate-bounce-in">{page.image}</span>
          <p className="text-xl text-gray-700 leading-relaxed max-w-lg mx-auto">{page.text}</p>
          <button onClick={() => speak(page.text)} className="mt-3 px-4 py-2 bg-purple-100 text-purple-600 rounded-2xl text-lg font-bold hover:bg-purple-200 transition-colors">
            🔊 {_('Listen')}
          </button>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${((currentPage + 1) / selectedStory.pages.length) * 100}%` }} />
        </div>

        <div className="flex gap-3">
          <button onClick={prevPage} disabled={currentPage === 0} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-lg font-bold disabled:opacity-50 hover:bg-gray-200 transition-colors">
            ⬅ {_('Back')}
          </button>
          <button onClick={nextPage} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl text-lg font-bold hover:scale-105 transition-transform active:scale-95">
            {currentPage < selectedStory.pages.length - 1 ? _('Next') + ' ➡' : '📝 ' + _('Quiz')}
          </button>
        </div>
      </div>
    </div>
  );
}
