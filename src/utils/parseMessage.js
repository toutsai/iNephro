export const parseMessage = (rawText) => {
  if (!rawText) return { content: '', suggestions: [] };
  if (rawText === '...') return { content: '...', suggestions: [] };

  const parts = rawText.split('///');
  let content = parts[0].trim();

  content = content.replace(/【[^】]*source[^】]*】/g, '');
  content = content.replace(/\[[^\]]*source[^\]]*\]/g, '');

  let suggestions = [];

  if (parts[1]) {
    let rawSuggestions = parts[1].trim();
    rawSuggestions = rawSuggestions
      .replace(/後續建議.*[:：]/g, '')
      .replace(/接下來您可能想知道的問題.*[:：]/g, '')
      .replace(/延伸閱讀.*[:：]/g, '')
      .replace(/相關問題.*[:：]/g, '')
      .replace(/您可能還想了解.*[:：]/g, '')
      .replace(/建議.*[:：]/g, '')
      .replace(/｜/g, '|')
      .replace(/\n/g, '|');
    suggestions = rawSuggestions.split('|').map(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '')).filter(s => s.length > 0);
  }
  return { content, suggestions };
};
