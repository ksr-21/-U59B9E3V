
import { GoogleGenAI } from "@google/genai";
import { Product, ForecastResult } from "../types.ts";

export const getAIExplanation = async (product: Product, forecast: ForecastResult): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Act as a senior retail consultant. Explain this inventory forecast in simple, non-technical language.
      Product: ${product.name}
      Current Stock: ${product.currentStock} units
      Historical Avg Daily Sales: ${forecast.historicalAvg}
      Forecasted Demand (7 Days): ${forecast.predictedDemand7Days}
      Recent Trend: ${forecast.trendPercentage}% 
      Suggested Restock: ${forecast.recommendedRestock} units

      Structure your response:
      1. Why we recommend this restock quantity.
      2. The risk of doing nothing.
      3. Business context.
      Keep it under 80 words.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Unable to generate explanation.";
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Error fetching AI insights.";
  }
};

export const getSimulationInsight = async (
  scenario: string, 
  impactedCount: number, 
  totalRestock: number,
  riskLevel: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Act as a Business Strategy Advisor. I am running a "What-If" inventory simulation.
      Scenario Description: ${scenario}
      Impact: ${impactedCount} products at risk of stockout.
      Total Capital Required for optimal restock: $${totalRestock.toLocaleString()}.
      System Calculated Risk Level: ${riskLevel}.

      Task: Provide a 2-3 sentence strategic recommendation for the business owner. 
      Focus on "Explainability": Why does this scenario create risk and how should they adapt (e.g. order early, increase safety stock)?
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Prepare for supply chain volatility.";
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Scenario suggests cautious inventory buffers.";
  }
};

export const getChatResponse = async (
  userMessage: string,
  context: {
    scenario: string;
    products: Product[];
    forecasts: ForecastResult[];
  }
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Detailed inventory context for the AI
    const inventoryContext = context.products.map(p => {
      const f = context.forecasts.find(forecast => forecast.productId === p.id);
      return `${p.name}: ${p.currentStock} in stock, Rec: ${f?.recommendedRestock || 0} restock.`;
    }).join('\n');

    const systemPrompt = `
      You are "SmartStock AI Assistant", a specialist in retail inventory optimization.
      
      CURRENT SCENARIO CONTEXT:
      ${context.scenario}
      
      FULL INVENTORY DATA:
      ${inventoryContext}

      YOUR GOAL:
      1. Answer the retailer's questions about inventory risks and opportunities.
      2. Suggest specific restock or pricing strategies based on the current "What-If" scenario.
      3. Be concise, actionable, and encouraging.
      4. Use a professional yet helpful tone.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: userMessage }] },
      config: {
        systemInstruction: systemPrompt
      }
    });

    return response.text || "I'm having trouble analyzing this scenario. Could you try rephrasing?";
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm temporarily disconnected from the AI core. Please check your connectivity and API key.";
  }
};
