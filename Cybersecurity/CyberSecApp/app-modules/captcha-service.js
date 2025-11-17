// Simple CAPTCHA service
export class CaptchaService {
  static generateChallenge() {
    // Define our categories and images
    const categories = {
      bicycles: [
        { id: 'bike1', url: '/images/captcha/bicycle1.jpg', alt: 'Rower' },
        { id: 'bike2', url: '/images/captcha/bicycle2.jpg', alt: 'Rower' },
        { id: 'bike3', url: '/images/captcha/bicycle3.jpg', alt: 'Rower' }
      ],
      cars: [
        { id: 'car1', url: '/images/captcha/car1.jpg', alt: 'Samochód' },
        { id: 'car2', url: '/images/captcha/car2.jpg', alt: 'Samochód' },
        { id: 'car3', url: '/images/captcha/car3.jpg', alt: 'Samochód' }
      ],
      lights: [
        { id: 'light1', url: '/images/captcha/light1.jpg', alt: 'Sygnalizator' },
        { id: 'light2', url: '/images/captcha/light2.jpg', alt: 'Sygnalizator' },
        { id: 'light3', url: '/images/captcha/light3.jpg', alt: 'Sygnalizator' }
      ]
    };

    // Choose random category to ask for
    const categoryNames = Object.keys(categories);
    const randomCategory = categoryNames[Math.floor(Math.random() * categoryNames.length)];
    
    // Create question text
    const questions = {
      bicycles: 'Zaznacz wszystkie rowery',
      cars: 'Zaznacz wszystkie samochody', 
      lights: 'Zaznacz wszystkie sygnalizatory świetlne'
    };

    // Get correct images for this category
    const correctImages = categories[randomCategory];
    
    // Get incorrect images from other categories
    const incorrectImages = [];
    categoryNames.forEach(cat => {
      if (cat !== randomCategory) {
        incorrectImages.push(...categories[cat]);
      }
    });
    
    // Shuffle incorrect images and take 6 (we need 9 total: 3 correct + 6 incorrect)
    const shuffledIncorrect = [...incorrectImages].sort(() => Math.random() - 0.5).slice(0, 6);
    
    // Combine and shuffle all images
    const allImages = [...correctImages, ...shuffledIncorrect];
    const shuffledImages = [...allImages].sort(() => Math.random() - 0.5);
    
    // Mark which images are correct
    const challengeImages = shuffledImages.map(img => ({
      ...img,
      isCorrect: correctImages.some(correctImg => correctImg.id === img.id)
    }));

    return {
      challengeId: Date.now().toString(),
      question: questions[randomCategory],
      images: challengeImages,
      correctCategory: randomCategory
    };
  }

  static verifyChallenge(selectedImages, storedChallenge) {
    if (!selectedImages) {
      return false;
    }

    // Ensure selectedImages is always an array
    const selections = Array.isArray(selectedImages) ? selectedImages : [selectedImages];
    
    // Get correct image IDs from stored challenge
    const correctIds = storedChallenge.images
      .filter(img => img.isCorrect)
      .map(img => img.id);

    // Check if all correct images are selected and no extra images
    const selectedCorrect = selections.filter(id => correctIds.includes(id)).length;
    const selectedIncorrect = selections.filter(id => !correctIds.includes(id)).length;

    return selectedCorrect === correctIds.length && selectedIncorrect === 0;
  }
}