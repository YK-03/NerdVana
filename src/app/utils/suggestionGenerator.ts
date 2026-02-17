export function generateFollowUps(answerText: string, query: string): string[] {
    const text = answerText.toLowerCase();
    const suggestions: string[] = [];

    // Canon / Consistency
    if (text.includes("canon") || text.includes("official") || text.includes("manga") || text.includes("book")) {
        suggestions.push("Are there any contradictions?");
        suggestions.push("What do other sources say?");
    }

    // Theories / Fan Speculation
    if (text.includes("theory") || text.includes("fan") || text.includes("speculation") || text.includes("reddit")) {
        suggestions.push("Is this confirmed by the creator?");
        suggestions.push("What is the most popular theory?");
    }

    // Character Analysis
    if (text.includes("character") || text.includes("who is") || text.includes("strongest") || text.includes("powers")) {
        suggestions.push("Who is stronger than them?");
        suggestions.push("What are their key weaknesses?");
        suggestions.push("List their major appearances");
    }

    // Plot / Events
    if (text.includes("ending") || text.includes("death") || text.includes("plot") || text.includes("story")) {
        suggestions.push("Explain the timeline order");
        suggestions.push("What happens after this?");
        suggestions.push("Did I miss any easter eggs?");
    }

    // Fallbacks if few suggestions found
    if (suggestions.length < 2) {
        suggestions.push("Give a deeper explanation");
        suggestions.push("Summarize this quickly");
    }

    if (suggestions.length < 3) {
        suggestions.push("Any spoilers I should know?");
    }

    // Return top 3-4 unique suggestions
    return Array.from(new Set(suggestions)).slice(0, 4);
}
