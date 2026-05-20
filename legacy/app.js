const DEFAULT_API = '/api/nutrition';
const form = document.getElementById('nutrition-form');
const mealInput = document.getElementById('meal');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('image-preview');
const resultSection = document.getElementById('result');
const messageBox = document.getElementById('message');
const caloriesEl = document.getElementById('calories');
const proteinEl = document.getElementById('protein');
const fatEl = document.getElementById('fat');
const rawDataEl = document.getElementById('raw-data');
function showMessage(text, type = 'error') {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}
function showResult(data) {
  caloriesEl.textContent = data.calories;
  proteinEl.textContent = data.protein;
  fatEl.textContent = data.fat;
  rawDataEl.textContent = JSON.stringify(data.raw || data, null, 2);
  resultSection.classList.remove('hidden');
}
function updateImagePreview(file) {
  if (!file) {
    imagePreview.classList.add('hidden');
    imagePreview.src = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}
async function fetchNutritionData({ meal, imageFile }) {
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (meal) formData.append('meal', meal);
    const response = await fetch(DEFAULT_API, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Image request failed with status ${response.status}`);
    }
    const data = await response.json();
    return {
      calories: data.calories ?? data.energy_kcal ?? 0,
      protein: data.protein_g ?? data.protein ?? 0,
      fat: data.fat_g ?? data.fat ?? 0,
      raw: data,
    };
  }
  const params = new URLSearchParams();
  if (meal) params.set('meal', meal);
  const url = `${DEFAULT_API}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return {
    calories: data.calories ?? data.energy_kcal ?? 0,
    protein: data.protein_g ?? data.protein ?? 0,
    fat: data.fat_g ?? data.fat ?? 0,
    raw: data,
  };
}
imageInput.addEventListener('change', () => {
  updateImagePreview(imageInput.files[0]);
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resultSection.classList.add('hidden');
  showMessage('', '');
  const meal = mealInput.value.trim();
  const imageFile = imageInput.files[0] || null;
  if (!meal && !imageFile) {
    showMessage('Please enter a meal description or upload a meal image.', 'error');
    return;
  }
  try {
    showMessage('Fetching nutrition data…', 'success');
    const nutrition = await fetchNutritionData({ meal, imageFile });
    showResult(nutrition);
    showMessage('Nutrition data loaded successfully.', 'success');
  } catch (error) {
    showMessage(error.message || 'Could not load nutrition data.', 'error');
  }
});
