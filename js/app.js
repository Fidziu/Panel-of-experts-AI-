/**
 * AI Panel of Experts - Application Logic v2.0
 * Modern JavaScript ES6+ Implementation
 * 
 * @author AI Panel Team
 * @version 2.0.0
 * @description Multi-AI model testing interface with live metrics
 */

'use strict';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    API_URL: 'https://tknbjh.buildship.run/ai-panel-of-experts-2e91d458f1d8',
    
    AI_AGENTS: [
        'openAi', 'anthropic', 'gemini', 'xAiGrok', 'perplexity', 
        'diffy', 'deepSeek', 'groq', 'response'
    ],
    
    AGENT_NAMES: {
        'openAi': '🤖 OpenAI',
        'anthropic': '🧠 Anthropic', 
        'gemini': '💎 Gemini',
        'xAiGrok': '🚀 xAI Grok',
        'perplexity': '🔍 Perplexity',
        'diffy': '⚡ Diffy',
        'deepSeek': '🌊 DeepSeek',
        'groq': '⚡ Groq',
        'response': '📝 General Response'
    },
    
    DEMO_RESPONSES: {
        'openAi': 'For text analysis, I recommend GPT-4 Turbo for comprehensive understanding, with excellent context retention and nuanced interpretation capabilities.',
        'anthropic': 'Claude 3.5 Sonnet excels at text analysis with strong reasoning abilities, particularly for complex document analysis and content evaluation.',
        'gemini': 'Gemini Pro offers excellent text analysis with multimodal capabilities, great for processing documents with mixed content types.',
        'xAiGrok': 'Grok provides real-time analysis with web access, making it ideal for analyzing current events and trending topics in text.',
        'perplexity': 'For text analysis, combine multiple approaches: sentiment analysis, entity extraction, and semantic search for comprehensive insights.',
        'diffy': 'Consider using ensemble methods with multiple models - GPT-4 for reasoning, BERT for classification, and T5 for summarization.',
        'deepSeek': 'DeepSeek Coder V2 offers excellent text analysis for technical documents and code-related content with strong reasoning.',
        'groq': 'Groq provides ultra-fast inference for text analysis, ideal for real-time applications requiring immediate response.',
        'response': 'Best text analysis models: GPT-4 Turbo (general), Claude 3.5 (reasoning), Gemini Pro (multimodal), specialized BERT variants (classification).'
    },
    
    TYPING_SPEED: {
        MIN: 20,
        MAX: 50
    },
    
    DEMO_DELAYS: {
        MIN: 1000,
        MAX: 4000,
        STAGGER: 200
    }
};

// =============================================================================
// APPLICATION STATE
// =============================================================================

class AppState {
    constructor() {
        this.currentSessionId = null;
        this.requestStartTime = null;
        this.isDemo = false;
        
        // Active models
        this.activeModels = new Set(CONFIG.AI_AGENTS);
        
        // Timers and counters
        this.agentTimers = new Map();
        this.agentStartTimes = new Map();
        this.agentTokenCounters = new Map();
        this.agentTokenTimers = new Map();
        
        // Session statistics
        this.sessionStats = {
            totalRequests: 0,
            totalResponseTime: 0,
            agentTimes: new Map(),
            fastestAgent: null,
            slowestAgent: null
        };
    }
    
    reset() {
        this.clearAllTimers();
        this.agentStartTimes.clear();
        this.agentTokenCounters.clear();
        
        // Only reset active models
        this.getActiveAgents().forEach(agent => {
            this.agentStartTimes.set(agent, Date.now());
            this.agentTokenCounters.set(agent, 0);
        });
    }
    
    getActiveAgents() {
        return Array.from(this.activeModels);
    }
    
    toggleModel(agent) {
        if (this.activeModels.has(agent)) {
            this.activeModels.delete(agent);
        } else {
            this.activeModels.add(agent);
        }
        ModelManager.updateModelCount();
        ModelManager.updateVisibility();
    }
    
    clearAllTimers() {
        this.agentTimers.forEach(timer => clearInterval(timer));
        this.agentTokenTimers.forEach(timer => clearInterval(timer));
        this.agentTimers.clear();
        this.agentTokenTimers.clear();
    }
}

// =============================================================================
// DOM UTILITIES
// =============================================================================

class DOMUtils {
    static $(selector) {
        return document.querySelector(selector);
    }
    
    static $$(selector) {
        return document.querySelectorAll(selector);
    }
    
    static createElement(tag, className, innerHTML) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }
    
    static updateText(elementId, text) {
        const element = this.$(elementId);
        if (element) element.textContent = text;
    }
    
    static updateHTML(elementId, html) {
        const element = this.$(elementId);
        if (element) element.innerHTML = html;
    }
    
    static addClass(elementId, className) {
        const element = this.$(elementId);
        if (element) element.classList.add(className);
    }
    
    static removeClass(elementId, className) {
        const element = this.$(elementId);
        if (element) element.classList.remove(className);
    }
    
    static setClasses(elementId, classes) {
        const element = this.$(elementId);
        if (element) element.className = classes.join(' ');
    }
}

// =============================================================================
// API HANDLER
// =============================================================================

class APIHandler {
    static async testConnection() {
        DebugLogger.log('🔍 Testing API connection...');
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ prompt: "test" })
            });
            
            if (response.ok) {
                UIManager.updateAPIStatus('working');
                DebugLogger.log('✅ API is accessible!');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                UIManager.updateAPIStatus('cors-error');
                DebugLogger.log('🚫 CORS blocked - browser security prevents direct API access');
            } else {
                UIManager.updateAPIStatus('cors-error', error.message);
                DebugLogger.log(`❌ API test failed: ${error.message}`);
            }
            return false;
        }
    }
    
    static async sendRequest(data) {
        try {
            DebugLogger.log('🚀 Attempting direct API call...', data);
            
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            UIManager.updateAPIStatus('working');
            DebugLogger.log('✅ API call successful!', { responses: Object.keys(result).length });
            
            return result;
        } catch (error) {
            UIManager.updateAPIStatus('cors-error', error.message);
            DebugLogger.log('❌ Direct API failed - this is expected due to CORS', { error: error.message });
            throw error;
        }
    }
}

// =============================================================================
// MODEL MANAGER
// =============================================================================

class ModelManager {
    static init() {
        this.createModelToggles();
        this.setupEventListeners();
        this.updateModelCount();
    }
    
    static createModelToggles() {
        const togglesContainer = DOMUtils.$('#modelToggles');
        if (!togglesContainer) return;
        
        togglesContainer.innerHTML = '';
        
        CONFIG.AI_AGENTS.forEach(agent => {
            const toggleDiv = DOMUtils.createElement('div', 'model-toggle', `
                <input type="checkbox" id="toggle-${agent}" class="model-checkbox" checked>
                <label for="toggle-${agent}" class="model-name">${CONFIG.AGENT_NAMES[agent]}</label>
            `);
            
            toggleDiv.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = toggleDiv.querySelector('.model-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
                this.handleToggle(agent);
            });
            
            togglesContainer.appendChild(toggleDiv);
        });
    }
    
    static setupEventListeners() {
        const selectAllBtn = DOMUtils.$('#selectAllBtn');
        const deselectAllBtn = DOMUtils.$('#deselectAllBtn');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAll());
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => this.deselectAll());
        }
    }
    
    static handleToggle(agent) {
        const checkbox = DOMUtils.$(`#toggle-${agent}`);
        const toggleDiv = checkbox.closest('.model-toggle');
        
        if (checkbox.checked) {
            appState.activeModels.add(agent);
            toggleDiv.classList.remove('disabled');
        } else {
            appState.activeModels.delete(agent);
            toggleDiv.classList.add('disabled');
        }
        
        this.updateModelCount();
        this.updateVisibility();
    }
    
    static selectAll() {
        CONFIG.AI_AGENTS.forEach(agent => {
            const checkbox = DOMUtils.$(`#toggle-${agent}`);
            const toggleDiv = checkbox.closest('.model-toggle');
            
            checkbox.checked = true;
            toggleDiv.classList.remove('disabled');
            appState.activeModels.add(agent);
        });
        
        this.updateModelCount();
        this.updateVisibility();
    }
    
    static deselectAll() {
        CONFIG.AI_AGENTS.forEach(agent => {
            const checkbox = DOMUtils.$(`#toggle-${agent}`);
            const toggleDiv = checkbox.closest('.model-toggle');
            
            checkbox.checked = false;
            toggleDiv.classList.add('disabled');
            appState.activeModels.delete(agent);
        });
        
        this.updateModelCount();
        this.updateVisibility();
    }
    
    static updateModelCount() {
        const count = appState.activeModels.size;
        DOMUtils.updateText('#modelCount', `${count} model${count !== 1 ? 's' : ''} selected`);
        
        // Update send button state
        const sendBtn = DOMUtils.$('#sendBtn');
        if (sendBtn) {
            if (count === 0) {
                sendBtn.disabled = true;
                sendBtn.textContent = '❌ Select models first';
            } else {
                sendBtn.disabled = false;
                sendBtn.textContent = '🚀 Ask Panel';
            }
        }
    }
    
    static updateVisibility() {
        // Update timer cards visibility
        CONFIG.AI_AGENTS.forEach(agent => {
            const timerCard = DOMUtils.$(`#timer-${agent}`);
            const chatWindow = DOMUtils.$(`#chat-${agent}`);
            
            if (timerCard) {
                timerCard.style.display = appState.activeModels.has(agent) ? 'block' : 'none';
            }
            
            if (chatWindow) {
                chatWindow.style.display = appState.activeModels.has(agent) ? 'flex' : 'none';
            }
        });
    }
}

class UIManager {
    static init() {
        this.createTimerCards();
        this.createChatWindows();
        this.updateAPIStatus('unknown');
        this.setupEventListeners();
        this.updateCurrentURL();
        
        // Initialize model manager
        ModelManager.init();
    }
    
    static setupEventListeners() {
        const sendBtn = DOMUtils.$('#sendBtn');
        const demoBtn = DOMUtils.$('#demoBtn');
        const promptInput = DOMUtils.$('#prompt');
        
        if (sendBtn) sendBtn.addEventListener('click', () => RequestHandler.sendRequest());
        if (demoBtn) demoBtn.addEventListener('click', () => RequestHandler.runDemo());
        
        if (promptInput) {
            // Enhanced keyboard handling
            promptInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (event.ctrlKey) {
                        event.preventDefault();
                        RequestHandler.sendRequest();
                    }
                    // Allow normal Enter for new lines
                }
            });
            
            // Auto-resize textarea
            promptInput.addEventListener('input', () => {
                promptInput.style.height = 'auto';
                promptInput.style.height = promptInput.scrollHeight + 'px';
            });
        }
    }
    
    static createTimerCards() {
        const timerGrid = DOMUtils.$('#timerGrid');
        if (!timerGrid) return;
        
        timerGrid.innerHTML = '';
        
        CONFIG.AI_AGENTS.forEach(agent => {
            const timerCard = DOMUtils.createElement('div', 'timer-card', `
                <div class="timer-name">${CONFIG.AGENT_NAMES[agent]}</div>
                <div class="timer-value" id="time-${agent}">0ms</div>
                <div class="timer-tokens" id="tokens-${agent}">0 tokens</div>
                <div class="timer-tps" id="tps-${agent}">0 t/s</div>
                <div class="timer-status" id="status-${agent}">Ready</div>
            `);
            timerCard.id = `timer-${agent}`;
            timerGrid.appendChild(timerCard);
        });
    }
    
    static createChatWindows() {
        const chatGrid = DOMUtils.$('#chatGrid');
        if (!chatGrid) return;
        
        chatGrid.innerHTML = '';
        
        CONFIG.AI_AGENTS.forEach(agent => {
            const chatWindow = DOMUtils.createElement('div', 'chat-window', `
                <div class="chat-header">
                    <div class="chat-title">${CONFIG.AGENT_NAMES[agent]}</div>
                </div>
                <div class="chat-content">
                    <div class="typing-indicator" id="typing-${agent}">Thinking</div>
                    <div class="chat-response" id="response-${agent}">Ready for your question...</div>
                </div>
            `);
            chatWindow.id = `chat-${agent}`;
            chatGrid.appendChild(chatWindow);
        });
    }
    
    static updateAPIStatus(status, message = '') {
        const statusElement = DOMUtils.$('#apiStatus');
        if (!statusElement) return;
        
        statusElement.className = `api-status status-${status}`;
        
        const statusText = {
            'unknown': 'API Status: Testing...',
            'working': 'API Status: Working ✅',
            'cors-error': 'API Status: CORS Blocked 🚫',
            'demo': 'API Status: Demo Mode ✨'
        };
        
        statusElement.textContent = statusText[status] + (message ? ` - ${message}` : '');
    }
    
    static updateCurrentURL() {
        DOMUtils.updateText('#currentUrl', window.location.href);
    }
    
    static resetInterface() {
        const activeAgents = appState.getActiveAgents();
        
        activeAgents.forEach(agent => {
            const timerCard = DOMUtils.$(`#timer-${agent}`);
            const chatWindow = DOMUtils.$(`#chat-${agent}`);
            const typingIndicator = DOMUtils.$(`#typing-${agent}`);
            const responseDiv = DOMUtils.$(`#response-${agent}`);
            
            // Reset timer card
            if (timerCard) {
                timerCard.className = appState.isDemo ? 'timer-card demo' : 'timer-card';
            }
            
            // Reset values
            DOMUtils.updateText(`#time-${agent}`, '0ms');
            DOMUtils.updateText(`#tokens-${agent}`, '0 tokens');
            DOMUtils.updateText(`#tps-${agent}`, '0 t/s');
            DOMUtils.updateText(`#status-${agent}`, 'Waiting...');
            
            // Reset chat window
            if (chatWindow) {
                chatWindow.className = appState.isDemo ? 'chat-window demo' : 'chat-window';
            }
            
            // Reset indicators
            if (typingIndicator) typingIndicator.className = 'typing-indicator';
            if (responseDiv) responseDiv.textContent = '';
        });
    }
}

// =============================================================================
// TIMER MANAGER
// =============================================================================

class TimerManager {
    static updateTimer(agent, status = 'responding') {
        const timerCard = DOMUtils.$(`#timer-${agent}`);
        const chatWindow = DOMUtils.$(`#chat-${agent}`);
        
        // Build class names
        let timerClasses = ['timer-card'];
        let chatClasses = ['chat-window'];
        
        if (appState.isDemo) {
            timerClasses.push('demo');
            chatClasses.push('demo');
        }
        
        if (status === 'responding') {
            this.startResponding(agent, timerClasses, chatClasses);
        } else if (status === 'completed') {
            this.completeResponse(agent, timerClasses, chatClasses);
        } else if (status === 'error') {
            this.handleError(agent, timerClasses, chatClasses);
        }
        
        // Apply classes
        if (timerCard) timerCard.className = timerClasses.join(' ');
        if (chatWindow) chatWindow.className = chatClasses.join(' ');
    }
    
    static startResponding(agent, timerClasses, chatClasses) {
        timerClasses.push('responding');
        chatClasses.push('active');
        
        DOMUtils.updateText(`#status-${agent}`, appState.isDemo ? 'Simulating...' : 'Responding...');
        
        // Start timer update
        if (!appState.agentTimers.has(agent)) {
            const timer = setInterval(() => {
                const elapsed = Date.now() - appState.agentStartTimes.get(agent);
                DOMUtils.updateText(`#time-${agent}`, `${elapsed}ms`);
                
                // Calculate TPS
                const elapsedSeconds = elapsed / 1000;
                if (elapsedSeconds > 0) {
                    const tokens = appState.agentTokenCounters.get(agent) || 0;
                    const tps = Math.round(tokens / elapsedSeconds * 10) / 10;
                    DOMUtils.updateText(`#tps-${agent}`, `${tps} t/s`);
                }
            }, 10);
            
            appState.agentTimers.set(agent, timer);
        }
        
        // Start token counter for demo mode
        if (appState.isDemo && !appState.agentTokenTimers.has(agent)) {
            const tokenTimer = setInterval(() => {
                const currentTokens = appState.agentTokenCounters.get(agent) || 0;
                const newTokens = currentTokens + Math.floor(Math.random() * 3) + 1;
                appState.agentTokenCounters.set(agent, newTokens);
                DOMUtils.updateText(`#tokens-${agent}`, `${newTokens} tokens`);
            }, 100 + Math.random() * 200);
            
            appState.agentTokenTimers.set(agent, tokenTimer);
        }
    }
    
    static completeResponse(agent, timerClasses, chatClasses) {
        timerClasses.push('completed');
        chatClasses.push('completed');
        
        DOMUtils.updateText(`#status-${agent}`, appState.isDemo ? 'Demo Complete ✨' : 'Completed ✅');
        
        // Stop timers
        this.stopTimers(agent);
        
        // Final calculations
        const elapsed = Date.now() - appState.agentStartTimes.get(agent);
        DOMUtils.updateText(`#time-${agent}`, `${elapsed}ms`);
        
        const elapsedSeconds = elapsed / 1000;
        if (elapsedSeconds > 0) {
            const tokens = appState.agentTokenCounters.get(agent) || 0;
            const finalTPS = Math.round(tokens / elapsedSeconds * 10) / 10;
            DOMUtils.updateText(`#tps-${agent}`, `${finalTPS} t/s`);
        }
        
        // Update session stats
        SessionStats.updateStats(agent, elapsed);
    }
    
    static handleError(agent, timerClasses, chatClasses) {
        timerClasses.push('error');
        chatClasses.push('error');
        
        DOMUtils.updateText(`#status-${agent}`, 'Error ❌');
        this.stopTimers(agent);
    }
    
    static stopTimers(agent) {
        if (appState.agentTimers.has(agent)) {
            clearInterval(appState.agentTimers.get(agent));
            appState.agentTimers.delete(agent);
        }
        
        if (appState.agentTokenTimers.has(agent)) {
            clearInterval(appState.agentTokenTimers.get(agent));
            appState.agentTokenTimers.delete(agent);
        }
    }
}

// =============================================================================
// TYPING SIMULATOR
// =============================================================================

class TypingSimulator {
    static simulateTyping(agent, text, speed = null) {
        const responseDiv = DOMUtils.$(`#response-${agent}`);
        const typingIndicator = DOMUtils.$(`#typing-${agent}`);
        
        if (!responseDiv || !typingIndicator) return;
        
        // Calculate speed
        const typingSpeed = speed || (CONFIG.TYPING_SPEED.MIN + Math.random() * (CONFIG.TYPING_SPEED.MAX - CONFIG.TYPING_SPEED.MIN));
        
        // Show typing indicator
        typingIndicator.className = 'typing-indicator active';
        responseDiv.textContent = '';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                responseDiv.textContent += text.charAt(i);
                i++;
                
                // Update token count based on characters
                const wordCount = responseDiv.textContent.split(' ').length;
                const tokenCount = Math.ceil(wordCount * 1.3); // Rough estimation
                appState.agentTokenCounters.set(agent, tokenCount);
                DOMUtils.updateText(`#tokens-${agent}`, `${tokenCount} tokens`);
                
                // Calculate real-time TPS
                const elapsed = Date.now() - appState.agentStartTimes.get(agent);
                const elapsedSeconds = elapsed / 1000;
                if (elapsedSeconds > 0) {
                    const tps = Math.round(tokenCount / elapsedSeconds * 10) / 10;
                    DOMUtils.updateText(`#tps-${agent}`, `${tps} t/s`);
                }
            } else {
                clearInterval(typeInterval);
                typingIndicator.className = 'typing-indicator';
                TimerManager.updateTimer(agent, 'completed');
            }
        }, typingSpeed);
    }
}

// =============================================================================
// SESSION STATISTICS
// =============================================================================

class SessionStats {
    static updateStats(agent, responseTime) {
        if (!appState.sessionStats.agentTimes.has(agent)) {
            appState.sessionStats.agentTimes.set(agent, []);
        }
        
        appState.sessionStats.agentTimes.get(agent).push(responseTime);
        appState.sessionStats.totalResponseTime += responseTime;
        
        // Find fastest and slowest
        let fastestTime = Infinity;
        let slowestTime = 0;
        let fastestAgent = null;
        let slowestAgent = null;
        
        appState.sessionStats.agentTimes.forEach((times, agentName) => {
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            if (avgTime < fastestTime) {
                fastestTime = avgTime;
                fastestAgent = agentName;
            }
            if (avgTime > slowestTime) {
                slowestTime = avgTime;
                slowestAgent = agentName;
            }
        });
        
        appState.sessionStats.fastestAgent = fastestAgent;
        appState.sessionStats.slowestAgent = slowestAgent;
        
        // Update UI
        this.updateStatsUI();
    }
    
    static updateStatsUI() {
        const stats = appState.sessionStats;
        
        DOMUtils.updateText('#totalRequests', stats.totalRequests.toString());
        
        if (stats.totalRequests > 0) {
            const avgTime = Math.round(stats.totalResponseTime / stats.totalRequests);
            DOMUtils.updateText('#avgResponseTime', `${avgTime}ms`);
        }
        
        DOMUtils.updateText('#fastestAgent', 
            stats.fastestAgent ? CONFIG.AGENT_NAMES[stats.fastestAgent] : '-');
        DOMUtils.updateText('#slowestAgent', 
            stats.slowestAgent ? CONFIG.AGENT_NAMES[stats.slowestAgent] : '-');
    }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

class RequestHandler {
    static async sendRequest() {
        appState.isDemo = false;
        
        const sessionId = DOMUtils.$('#sessionId')?.value.trim();
        const instructions = DOMUtils.$('#instructions')?.value.trim();
        const prompt = DOMUtils.$('#prompt')?.value.trim();
        const sendBtn = DOMUtils.$('#sendBtn');
        
        if (!prompt) {
            alert('Please enter a prompt!');
            return;
        }
        
        const activeAgents = appState.getActiveAgents();
        if (activeAgents.length === 0) {
            alert('Please select at least one AI model!');
            return;
        }
        
        // Setup session
        appState.currentSessionId = sessionId || `session_${Date.now()}`;
        DOMUtils.updateText('#sessionId', appState.currentSessionId);
        
        // Update stats
        appState.sessionStats.totalRequests++;
        
        // Reset UI and timers
        this.prepareForRequest(sendBtn);
        
        try {
            const data = { 
                sessionId: appState.currentSessionId, 
                instructions, 
                prompt 
            };
            
            // Remove empty properties
            Object.keys(data).forEach(key => {
                if (!data[key]) delete data[key];
            });
            
            const result = await APIHandler.sendRequest(data);
            
            // Process responses only for active agents
            activeAgents.forEach(agent => {
                if (result[agent]) {
                    TypingSimulator.simulateTyping(agent, result[agent]);
                } else {
                    DOMUtils.updateText(`#response-${agent}`, 'No response from this agent');
                    TimerManager.updateTimer(agent, 'completed');
                }
            });
            
        } catch (error) {
            // Handle error for active agents only
            activeAgents.forEach(agent => {
                DOMUtils.updateText(`#response-${agent}`, 'CORS blocked - try demo mode or deploy to Netlify');
                TimerManager.updateTimer(agent, 'error');
            });
        } finally {
            this.restoreButton(sendBtn);
        }
    }
    
    static runDemo() {
        appState.isDemo = true;
        UIManager.updateAPIStatus('demo');
        DebugLogger.log('✨ Running demo mode with simulated responses...');
        
        const activeAgents = appState.getActiveAgents();
        if (activeAgents.length === 0) {
            alert('Please select at least one AI model!');
            return;
        }
        
        const prompt = DOMUtils.$('#prompt')?.value.trim() || 'What is the best AI model for text analysis?';
        DOMUtils.updateText('#prompt', prompt);
        
        // Setup demo session
        appState.currentSessionId = `demo_${Date.now()}`;
        DOMUtils.updateText('#sessionId', appState.currentSessionId);
        
        // Update stats
        appState.sessionStats.totalRequests++;
        
        // Reset UI
        this.prepareForRequest();
        
        // Start demo with staggered delays - only for active agents
        activeAgents.forEach((agent, index) => {
            setTimeout(() => {
                TimerManager.updateTimer(agent, 'responding');
                
                // Simulate different response times
                const responseDelay = CONFIG.DEMO_DELAYS.MIN + 
                    Math.random() * (CONFIG.DEMO_DELAYS.MAX - CONFIG.DEMO_DELAYS.MIN) + 
                    (index * CONFIG.DEMO_DELAYS.STAGGER);
                
                setTimeout(() => {
                    TypingSimulator.simulateTyping(
                        agent, 
                        CONFIG.DEMO_RESPONSES[agent],
                        CONFIG.TYPING_SPEED.MIN + Math.random() * (CONFIG.TYPING_SPEED.MAX - CONFIG.TYPING_SPEED.MIN)
                    );
                }, responseDelay);
            }, index * 100);
        });
        
        DebugLogger.log(`✨ Demo started - simulating ${activeAgents.length} AI agents`, {
            mode: 'demo',
            prompt: prompt,
            agents: activeAgents.length
        });
        
        // Reset demo mode after completion
        setTimeout(() => {
            appState.isDemo = false;
            UIManager.updateAPIStatus('cors-error');
        }, 8000);
    }
    
    static prepareForRequest(sendBtn = null) {
        // Reset state and UI
        appState.reset();
        UIManager.resetInterface();
        
        // Update button
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = '🔄 Processing...';
        }
        
        appState.requestStartTime = Date.now();
        
        // Start timers only for active agents
        appState.getActiveAgents().forEach(agent => {
            TimerManager.updateTimer(agent, 'responding');
        });
    }
    
    static restoreButton(sendBtn) {
        if (sendBtn) {
            sendBtn.disabled = false;
            const count = appState.activeModels.size;
            sendBtn.textContent = count > 0 ? '🚀 Ask Panel' : '❌ Select models first';
        }
    }
}

// =============================================================================
// DEBUG LOGGER
// =============================================================================

class DebugLogger {
    static log(message, data = null) {
        const debugInfo = DOMUtils.$('#debugInfo');
        if (!debugInfo) return;
        
        const timestamp = new Date().toLocaleTimeString();
        let debugText = `[${timestamp}] ${message}\n`;
        
        if (data) {
            debugText += JSON.stringify(data, null, 2) + '\n';
        }
        
        debugText += '\n' + debugInfo.textContent;
        
        // Keep only last 15 debug entries (approximately)
        const lines = debugText.split('\n');
        if (lines.length > 60) {
            debugText = lines.slice(0, 60).join('\n');
        }
        
        debugInfo.textContent = debugText;
        
        // Also log to console for development
        console.log(`[AI Panel] ${message}`, data || '');
    }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

// Global state instance
const appState = new AppState();

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
    
    // Test API connection after a short delay
    setTimeout(() => {
        APIHandler.testConnection();
    }, 1000);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause timers when page is hidden
        appState.clearAllTimers();
    }
});

// Handle window beforeunload
window.addEventListener('beforeunload', () => {
    appState.clearAllTimers();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        AppState,
        UIManager,
        TimerManager,
        RequestHandler,
        DebugLogger
    };
}