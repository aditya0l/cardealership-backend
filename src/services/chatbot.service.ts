import { config } from '../config/env';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class ChatbotService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-3.5-turbo';

  constructor() {
    this.apiKey = config.openaiApiKey;
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not configured. Chatbot service will not work.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getSystemPrompt(): string {
    return `You are a helpful AI assistant for a car dealership management system. 
You help dealership staff with:
- Information about enquiries, bookings, quotations, and stock
- Guidance on dealership processes and procedures
- General automotive knowledge
- Customer service best practices

Please provide helpful, professional, and accurate responses. If you're unsure about specific dealership data or policies, ask the user to check with their manager or the system records.`;
  }

  async sendMessage(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    if (!this.apiKey) {
      return "I'm sorry, but the chatbot service is not currently configured. Please contact your system administrator.";
    }

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this.getSystemPrompt() },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Limit conversation history to last 10 exchanges to manage token usage
      const limitedMessages = messages.length > 21 
        ? [messages[0], ...messages.slice(-20)] 
        : messages;

      const requestBody: ChatCompletionRequest = {
        model: this.model,
        messages: limitedMessages,
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        
        if (response.status === 401) {
          return "I'm sorry, but there's an authentication issue with the chatbot service. Please contact your system administrator.";
        } else if (response.status === 429) {
          return "I'm currently experiencing high traffic. Please try again in a moment.";
        } else {
          return "I'm sorry, but I'm experiencing technical difficulties. Please try again later.";
        }
      }

      const data = await response.json() as ChatCompletionResponse;
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
      } else {
        console.error('Unexpected response format from OpenAI:', data);
        return "I'm sorry, but I didn't receive a proper response. Please try again.";
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return "I'm sorry, but I'm currently unavailable due to a technical issue. Please try again later.";
    }
  }

  async getEnquiryAdvice(enquiryDescription: string): Promise<string> {
    const prompt = `Based on this customer enquiry: "${enquiryDescription}"
    
Please provide:
1. Suggested follow-up questions to better understand the customer's needs
2. Recommended approach for handling this enquiry
3. Any potential challenges or considerations

Keep your response practical and focused on dealership operations.`;

    return this.sendMessage(prompt);
  }

  async getStockRecommendations(customerRequirements: string): Promise<string> {
    const prompt = `A customer has these requirements: "${customerRequirements}"

Please suggest:
1. Types of vehicles that might match their needs
2. Key features to highlight during the sales process
3. Questions to ask to better understand their preferences
4. Potential alternatives if their first choice isn't available

Focus on practical sales advice for dealership staff.`;

    return this.sendMessage(prompt);
  }

  async getCustomerServiceAdvice(situation: string): Promise<string> {
    const prompt = `Help me handle this customer service situation: "${situation}"

Please provide:
1. Recommended approach for addressing the customer's concerns
2. Key points to communicate
3. Potential solutions or compromises
4. How to maintain a positive relationship

Keep the advice professional and customer-focused.`;

    return this.sendMessage(prompt);
  }

  async getDealershipProcessGuidance(question: string): Promise<string> {
    const prompt = `I need guidance on this dealership process: "${question}"

Please provide general best practices and recommendations for automotive dealership operations. If this requires specific company policies, remind me to check with my manager or company documentation.`;

    return this.sendMessage(prompt);
  }

  // Helper method to validate conversation history format
  validateConversationHistory(history: any[]): ChatMessage[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history.filter(msg => 
      msg && 
      typeof msg === 'object' && 
      ['system', 'user', 'assistant'].includes(msg.role) &&
      typeof msg.content === 'string'
    );
  }
}

export default new ChatbotService();
