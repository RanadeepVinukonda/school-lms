import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useParams } from 'react-router-dom';

interface FlashCard {
  id: string;
  frontText: string;
  frontImage: string;
  backText: string;
  backDescription: string;
  category: string;
}

export default function K2FlashcardsPage() {
  const { _ } = useTranslation();

  const categories = [
    { id: 'letters', label: _('Letters'), emoji: '🔤', color: 'from-red-400 to-red-500' },
    { id: 'numbers', label: _('Numbers'), emoji: '🔢', color: 'from-blue-400 to-blue-500' },
    { id: 'colors', label: _('Colors'), emoji: '🎨', color: 'from-green-400 to-green-500' },
    { id: 'shapes', label: _('Shapes'), emoji: '⬛', color: 'from-yellow-400 to-yellow-500' },
    { id: 'animals', label: _('Animals'), emoji: '🐾', color: 'from-purple-400 to-purple-500' },
  ];

  const flashcardsData: Record<string, FlashCard[]> = {
    letters: [
      { id: 'l1', frontText: 'A', frontImage: '🍎', backText: 'A', backDescription: _('A is for Apple. Apples are red and yummy!'), category: 'letters' },
      { id: 'l2', frontText: 'B', frontImage: '⚽', backText: 'B', backDescription: _('B is for Ball. Balls are for playing!'), category: 'letters' },
      { id: 'l3', frontText: 'C', frontImage: '🐱', backText: 'C', backDescription: _('C is for Cat. Cats say meow!'), category: 'letters' },
      { id: 'l4', frontText: 'D', frontImage: '🐶', backText: 'D', backDescription: _('D is for Dog. Dogs say woof!'), category: 'letters' },
      { id: 'l5', frontText: 'E', frontImage: '🐘', backText: 'E', backDescription: _('E is for Elephant. Elephants are big!'), category: 'letters' },
      { id: 'l6', frontText: 'F', frontImage: '🐟', backText: 'F', backDescription: _('F is for Fish. Fish swim in water!'), category: 'letters' },
    ],
    numbers: [
      { id: 'n1', frontText: '1', frontImage: '1️⃣', backText: 'One', backDescription: _('One sun in the sky!'), category: 'numbers' },
      { id: 'n2', frontText: '2', frontImage: '2️⃣', backText: 'Two', backDescription: _('Two eyes to see the world!'), category: 'numbers' },
      { id: 'n3', frontText: '3', frontImage: '3️⃣', backText: 'Three', backDescription: _('Three little kittens!'), category: 'numbers' },
      { id: 'n4', frontText: '4', frontImage: '4️⃣', backText: 'Four', backDescription: _('Four legs on a chair!'), category: 'numbers' },
      { id: 'n5', frontText: '5', frontImage: '5️⃣', backText: 'Five', backDescription: _('Five fingers on one hand!'), category: 'numbers' },
      { id: 'n6', frontText: '6', frontImage: '6️⃣', backText: 'Six', backDescription: _('Six sides on a cube!'), category: 'numbers' },
    ],
    colors: [
      { id: 'c1', frontText: 'Red', frontImage: '🔴', backText: 'Red', backDescription: _('Red like apples and strawberries!'), category: 'colors' },
      { id: 'c2', frontText: 'Blue', frontImage: '🔵', backText: 'Blue', backDescription: _('Blue like the sky and ocean!'), category: 'colors' },
      { id: 'c3', frontText: 'Yellow', frontImage: '🟡', backText: 'Yellow', backDescription: _('Yellow like the sun and bananas!'), category: 'colors' },
      { id: 'c4', frontText: 'Green', frontImage: '🟢', backText: 'Green', backDescription: _('Green like grass and leaves!'), category: 'colors' },
      { id: 'c5', frontText: 'Purple', frontImage: '🟣', backText: 'Purple', backDescription: _('Purple like grapes and lavender!'), category: 'colors' },
      { id: 'c6', frontText: 'Orange', frontImage: '🟠', backText: 'Orange', backDescription: _('Orange like oranges and carrots!'), category: 'colors' },
    ],
    shapes: [
      { id: 's1', frontText: 'Circle', frontImage: '⭕', backText: 'Circle', backDescription: _('A round shape like a ball!'), category: 'shapes' },
      { id: 's2', frontText: 'Square', frontImage: '🟦', backText: 'Square', backDescription: _('A shape with 4 equal sides!'), category: 'shapes' },
      { id: 's3', frontText: 'Triangle', frontImage: '🔺', backText: 'Triangle', backDescription: _('A shape with 3 sides!'), category: 'shapes' },
      { id: 's4', frontText: 'Rectangle', frontImage: '🟨', backText: 'Rectangle', backDescription: _('A shape with 4 sides, 2 long!'), category: 'shapes' },
      { id: 's5', frontText: 'Star', frontImage: '⭐', backText: 'Star', backDescription: _('A shape with 5 points that shines!'), category: 'shapes' },
      { id: 's6', frontText: 'Heart', frontImage: '❤️', backText: 'Heart', backDescription: _('A shape that means love!'), category: 'shapes' },
    ],
    animals: [
      { id: 'a1', frontText: 'Lion', frontImage: '🦁', backText: 'Lion', backDescription: _('The king of the jungle! Roar!'), category: 'animals' },
      { id: 'a2', frontText: 'Elephant', frontImage: '🐘', backText: 'Elephant', backDescription: _('The biggest land animal with a trunk!'), category: 'animals' },
      { id: 'a3', frontText: 'Monkey', frontImage: '🐒', backText: 'Monkey', backDescription: _('A playful animal that loves bananas!'), category: 'animals' },
      { id: 'a4', frontText: 'Fish', frontImage: '🐟', backText: 'Fish', backDescription: _('An animal that swims in water!'), category: 'animals' },
      { id: 'a5', frontText: 'Bird', frontImage: '🐦', backText: 'Bird', backDescription: _('An animal that flies in the sky!'), category: 'animals' },
      { id: 'a6', frontText: 'Dog', frontImage: '🐶', backText: 'Dog', backDescription: _('A loyal friend! Woof woof!'), category: 'animals' },
    ],
  };
  const { category } = useParams<{ category: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>(category || '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const cards = selectedCategory ? flashcardsData[selectedCategory] || [] : [];
  const currentCard = cards[currentIndex] || null;

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  };

  const flipCard = () => {
    setFlipped(!flipped);
    if (!flipped && currentCard) {
      speak(currentCard.backText);
    }
  };

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    setCurrentIndex(0);
    setFlipped(false);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl p-4 shadow-lg border-2 border-yellow-200">
          <h2 className="text-2xl font-bold text-yellow-700 mb-3 flex items-center gap-2">
            <span>🃏</span> {_('Pick a Category')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`bg-gradient-to-br ${cat.color} text-white rounded-3xl p-6 text-center shadow-lg hover:scale-105 transition-transform active:scale-95`}
              >
                <span className="text-5xl block mb-2">{cat.emoji}</span>
                <span className="text-2xl font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center p-8">
        <p className="text-2xl text-gray-500">{_('No cards found')}</p>
        <button onClick={() => setSelectedCategory('')} className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-2xl text-lg font-bold">⬅ {_('Back')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-4 shadow-lg border-2 border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedCategory('')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-2xl text-lg font-bold hover:bg-gray-200">
            ⬅ {_('Back')}
          </button>
          <span className="text-lg font-bold text-purple-600">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        <div className="perspective-1000 cursor-pointer mb-4" onClick={flipCard}>
          <div className={`relative w-full aspect-[3/4] max-w-sm mx-auto transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-3xl flex flex-col items-center justify-center shadow-xl backface-hidden p-6">
              <span className="text-8xl mb-4">{currentCard.frontImage}</span>
              <span className="text-5xl font-bold text-white drop-shadow-lg">{currentCard.frontText}</span>
              <span className="text-sm text-white/70 mt-4">{_('Tap to flip')}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-green-400 rounded-3xl flex flex-col items-center justify-center shadow-xl rotate-y-180 backface-hidden p-6">
              <span className="text-6xl font-bold text-white drop-shadow-lg mb-3">{currentCard.backText}</span>
              <p className="text-xl text-white/90 text-center leading-relaxed">{currentCard.backDescription}</p>
              <button
                onClick={(e) => { e.stopPropagation(); speak(currentCard.backText); }}
                className="mt-4 px-4 py-2 bg-white/30 text-white rounded-2xl text-lg font-bold hover:bg-white/40"
              >
                🔊 {_('Listen')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={prevCard} disabled={currentIndex === 0} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-lg font-bold disabled:opacity-50 hover:bg-gray-200 transition-colors">
            ⬅ {_('Previous')}
          </button>
          <button onClick={nextCard} disabled={currentIndex === cards.length - 1} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl text-lg font-bold disabled:opacity-50 hover:scale-105 transition-transform active:scale-95">
            {_('Next')} ➡
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setFlipped(false); }}
              className={`w-3 h-3 rounded-full transition-all ${i === currentIndex ? 'bg-purple-500 scale-125' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
