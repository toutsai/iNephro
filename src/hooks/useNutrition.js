import { useState } from 'react';

export function useNutrition() {
  const [nutritionQuery, setNutritionQuery] = useState('');
  const [nutritionResults, setNutritionResults] = useState(null);
  const [isSearchingNutrition, setIsSearchingNutrition] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);

  const handleNutritionSearch = async (query = null) => {
    const searchQuery = query || nutritionQuery;
    if (!searchQuery.trim()) return;

    setIsSearchingNutrition(true);
    setNutritionResults(null);

    try {
      const response = await fetch(`/api/nutrition?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '查詢失敗');
      }

      setNutritionResults(data);
    } catch (error) {
      console.error('營養查詢錯誤:', error);
      setNutritionResults({
        error: error.message || '查詢失敗，請稍後再試'
      });
    } finally {
      setIsSearchingNutrition(false);
    }
  };

  return {
    nutritionQuery,
    setNutritionQuery,
    nutritionResults,
    isSearchingNutrition,
    showNutritionModal,
    setShowNutritionModal,
    handleNutritionSearch,
  };
}
