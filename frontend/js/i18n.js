// Simple translations (expand for Hindi & Telugu)
const translations = {
  en: {welcome: 'Welcome', recommend: 'Recommend Crop'},
  hi: {welcome: 'स्वागत है', recommend: 'फसल सुझाएँ'},
  te: {welcome: 'స్వాగతం', recommend: 'పంట సిఫార్సు'}
};
function t(k, lang='en'){ return (translations[lang] && translations[lang][k]) || translations['en'][k] || k; }
