import { useState, useEffect, useCallback } from 'react';

interface LetterCard {
  letter: string;
  word: string;
  image: string;
  color: string;
}

const letters: LetterCard[] = [
  { letter: 'A', word: 'Apple', image: '🍎', color: 'from-red-400 to-red-500' },
  { letter: 'B', word: 'Ball', image: '⚽', color: 'from-blue-400 to-blue-500' },
  { letter: 'C', word: 'Cat', image: '🐱', color: 'from-orange-400 to-orange-500' },
  { letter: 'D', word: 'Dog', image: '🐶', color: 'from-yellow-400 to-yellow-500' },
  { letter: 'E', word: 'Elephant', image: '🐘', color: 'from-purple-400 to-purple-500' },
  { letter: 'F', word: 'Fish', image: '🐟', color: 'from-cyan-400 to-cyan-500' },
  { letter: 'G', word: 'Goat', image: '🐐', color: 'from-green-400 to-green-500' },
  { letter: 'H', word: 'Hat', image: '🎩', color: 'from-pink-400 to-pink-500' },
  { letter: 'I', word: 'Ice Cream', image: '🍦', color: 'from-indigo-400 to-indigo-500' },
  { letter: 'J', word: 'Jug', image: '🏺', color: 'from-teal-400 to-teal-500' },
  { letter: 'K', word: 'Kite', image: '🪁', color: 'from-rose-400 to-rose-500' },
  { letter: 'L', word: 'Lion', image: '🦁', color: 'from-amber-400 to-amber-500' },
  { letter: 'M', word: 'Moon', image: '🌙', color: 'from-sky-400 to-sky-500' },
  { letter: 'N', word: 'Nest', image: '🪺', color: 'from-lime-400 to-lime-500' },
  { letter: 'O', word: 'Orange', image: '🍊', color: 'from-orange-400 to-orange-500' },
  { letter: 'P', word: 'Penguin', image: '🐧', color: 'from-violet-400 to-violet-500' },
  { letter: 'Q', word: 'Queen', image: '👑', color: 'from-fuchsia-400 to-fuchsia-500' },
  { letter: 'R', word: 'Rabbit', image: '🐰', color: 'from-pink-400 to-pink-500' },
  { letter: 'S', word: 'Sun', image: '☀️', color: 'from-yellow-400 to-yellow-500' },
  { letter: 'T', word: 'Tiger', image: '🐯', color: 'from-orange-400 to-orange-500' },
  { letter: 'U', word: 'Umbrella', image: '☂️', color: 'from-blue-400 to-blue-500' },
  { letter: 'V', word: 'Violin', image: '🎻', color: 'from-purple-400 to-purple-500' },
  { letter: 'W', word: 'Watermelon', image: '🍉', color: 'from-green-400 to-green-500' },
  { letter: 'X', word: 'Xylophone', image: '🎵', color: 'from-red-400 to-red-500' },
  { letter: 'Y', word: 'Yak', image: '🐂', color: 'from-amber-400 to-amber-500' },
  { letter: 'Z', word: 'Zebra', image: '🦓', color: 'from-gray-400 to-gray-500' },
];

const simpleWords = ['CAT', 'DOG', 'BAT', 'FAN', 'HAT', 'CUP', 'BUS', 'SUN', 'BED', 'BAG'];

export default function K2PhonicsPage() {
  const [selectedLetter, setSelectedLetter] = useState<LetterCard | null>(null);
  const [gameMode, setGameMode] = useState<'learn' | 'match' | 'word'>('learn');
  const [targetLetter, setTargetLetter] = useState<LetterCard | null>(null);
  const [score, setScore] = useState(0);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [draggedLetters, setDraggedLetters] = useState<string[]>([]);
  const [wordResult, setWordResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (gameMode === 'match') {
      pickRandomLetter();
    } else if (gameMode === 'word') {
      startWordGame();
    }
  }, [gameMode]);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const pickRandomLetter = () => {
    const card = letters[Math.floor(Math.random() * letters.length)];
    setTargetLetter(card);
  };

  const startWordGame = () => {
    const word = simpleWords[Math.floor(Math.random() * simpleWords.length)];
    setCurrentWord(word);
    setDraggedLetters([]);
    setWordResult(null);
    setWordBank(shuffleArray(word.split('')));
  };

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const handleLetterClick = (card: LetterCard) => {
    setSelectedLetter(card);
    speak(card.letter);
    setTimeout(() => speak(card.word), 600);
  };

  const handleMatchClick = (letter: string) => {
    if (!targetLetter) return;
    if (letter === targetLetter.letter) {
      speak(targetLetter.letter);
      setScore((s) => s + 1);
      setTimeout(pickRandomLetter, 800);
    } else {
      speak(letter);
    }
  };

  const handleDropLetter = (letter: string, index: number) => {
    if (wordResult) return;
    const newDragged = [...draggedLetters, letter];
    setDraggedLetters(newDragged);
    const newBank = [...wordBank];
    newBank.splice(index, 1);
    setWordBank(newBank);

    if (newDragged.length === currentWord.length) {
      if (newDragged.join('') === currentWord) {
        setWordResult('correct');
        setScore((s) => s + 5);
        speak(currentWord);
      } else {
        setWordResult('wrong');
      }
    }
  };

  const removeDropped = (index: number) => {
    if (wordResult) return;
    const letter = draggedLetters[index];
    const newDragged = [...draggedLetters];
    newDragged.splice(index, 1);
    setDraggedLetters(newDragged);
    setWordBank([...wordBank, letter]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-4 shadow-lg border-2 border-green-200">
        <h2 className="text-2xl font-bold text-green-700 mb-3 flex items-center gap-2">
          <span>🔊</span> Phonics Fun
        </h2>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setGameMode('learn')} className={`px-6 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'learn' ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}>📖 Learn</button>
          <button onClick={() => setGameMode('match')} className={`px-6 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'match' ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}>🎯 Match</button>
          <button onClick={() => setGameMode('word')} className={`px-6 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'word' ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}>🔤 Words</button>
        </div>

        {gameMode === 'learn' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {letters.map((card) => (
                <button
                  key={card.letter}
                  onClick={() => handleLetterClick(card)}
                  className={`bg-gradient-to-br ${card.color} text-white rounded-2xl p-3 text-center font-bold shadow-md hover:scale-105 transition-transform active:scale-95 ${selectedLetter?.letter === card.letter ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
                >
                  <div className="text-3xl">{card.letter}</div>
                  <div className="text-2xl mt-1">{card.image}</div>
                </button>
              ))}
            </div>
            {selectedLetter && (
              <div className="mt-4 bg-yellow-100 rounded-2xl p-4 text-center border-2 border-yellow-300 animate-bounce-in">
                <p className="text-5xl font-bold text-purple-600">{selectedLetter.letter}</p>
                <p className="text-2xl text-gray-700 mt-1">{selectedLetter.word}</p>
                <p className="text-4xl mt-2">{selectedLetter.image}</p>
                <button onClick={() => speak(selectedLetter.letter)} className="mt-2 px-6 py-2 bg-purple-500 text-white rounded-2xl text-lg font-bold hover:bg-purple-600 transition-colors">
                  🔁 Say it again
                </button>
              </div>
            )}
          </>
        )}

        {gameMode === 'match' && targetLetter && (
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 mb-4">Find the letter that sounds like...</p>
            <button
              onClick={() => speak(targetLetter.letter)}
              className="text-7xl mb-6 p-4 bg-purple-100 rounded-3xl hover:bg-purple-200 transition-colors animate-pulse"
            >
              🔊
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {shuffleArray(letters).slice(0, 12).map((card) => (
                <button
                  key={card.letter}
                  onClick={() => handleMatchClick(card.letter)}
                  className="bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-2xl p-4 text-3xl font-bold shadow-md hover:scale-105 transition-transform active:scale-95"
                >
                  {card.letter}
                </button>
              ))}
            </div>
            <p className="text-xl font-bold text-green-600 mt-4">Score: {score} ⭐</p>
          </div>
        )}

        {gameMode === 'word' && (
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 mb-4">Drag letters to make the word!</p>

            <div className="flex justify-center gap-3 mb-6 min-h-[70px]">
              {Array.from({ length: currentWord.length }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => removeDropped(i)}
                  className={`w-14 h-14 rounded-2xl text-3xl font-bold flex items-center justify-center transition-all ${
                    draggedLetters[i]
                      ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-200 border-2 border-dashed border-gray-400'
                  }`}
                >
                  {draggedLetters[i] || ''}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              {wordBank.map((letter, i) => (
                <button
                  key={`${letter}-${i}`}
                  onClick={() => handleDropLetter(letter, i)}
                  className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-2xl text-3xl font-bold shadow-md hover:scale-110 transition-transform active:scale-95"
                >
                  {letter}
                </button>
              ))}
            </div>

            {wordResult === 'correct' && (
              <div className="mt-4 p-4 bg-green-100 rounded-2xl border-2 border-green-300 text-green-700 animate-bounce-in">
                <p className="text-3xl font-bold">🎉 Correct! {currentWord}</p>
                <button onClick={startWordGame} className="mt-2 px-6 py-2 bg-green-500 text-white rounded-2xl text-lg font-bold hover:bg-green-600">Next Word</button>
              </div>
            )}
            {wordResult === 'wrong' && (
              <div className="mt-4 p-4 bg-red-100 rounded-2xl border-2 border-red-300 text-red-700">
                <p className="text-2xl font-bold">Try again! 🤔</p>
                <button
                  onClick={() => {
                    setDraggedLetters([]);
                    setWordBank(shuffleArray(currentWord.split('')));
                    setWordResult(null);
                  }}
                  className="mt-2 px-6 py-2 bg-red-500 text-white rounded-2xl text-lg font-bold"
                >
                  🔄 Retry
                </button>
              </div>
            )}

            <p className="text-xl font-bold text-green-600 mt-4">Score: {score} ⭐</p>
          </div>
        )}
      </div>
    </div>
  );
}
