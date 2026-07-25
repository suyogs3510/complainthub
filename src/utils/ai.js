/**
 * Simple AI simulation utility for the Complaint Management System.
 * In a real production app, these would call an LLM API (like OpenAI or Gemini).
 */

const CATEGORY_KEYWORDS = {
  Academic: ['course', 'exam', 'grade', 'result', 'professor', 'teacher', 'assignment', 'syllabus', 'lecture'],
  Electricity: ['power', 'light', 'fan', 'current', 'outage', 'wire', 'socket', 'plug', 'electricity', 'voltage'],
  Cleaning: ['dirty', 'dust', 'sweep', 'wash', 'cleaning', 'garbage', 'trash', 'messy', 'hygiene', 'toilet'],
  Hostel: ['room', 'bed', 'warden', 'mess', 'water', 'furniture', 'hostel', 'roommate', 'allotment'],
  Facilities: ['gym', 'canteen', 'sports', 'playground', 'water cooler', 'facility', 'equipment'],
  Library: ['book', 'journal', 'reading', 'library', 'silence', 'shelf', 'borrow', 'return'],
  Transportation: ['bus', 'van', 'shuttle', 'driver', 'route', 'timing', 'transport'],
  Ragging: ['harassment', 'bullying', 'ragging', 'raging', 'senior', 'threat', 'abuse', 'physical', 'mental', 'suicide', 'depression', 'attack', 'beating', 'fight', 'torture', 'intimidation', 'forced', 'shouting'],
};

const POSITIVE_WORDS = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thanks', 'thank', 'resolved', 'fixed', 'better'];
const NEGATIVE_WORDS = ['bad', 'worst', 'poor', 'unhappy', 'dissatisfied', 'terrible', 'awful', 'angry', 'slow', 'fail', 'broken', 'not working', 'urgent', 'immediately'];

/**
 * Predicts the category based on the text.
 */
export const predictCategory = (text) => {
  if (!text) return 'Other';
  const lowerText = text.toLowerCase();
  
  let bestCategory = 'Other';
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    keywords.forEach(word => {
      if (lowerText.includes(word)) score++;
    });
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return maxScore > 0 ? bestCategory : 'Other';
};

/**
 * Analyzes the sentiment of the text.
 * Returns a score between -1 (negative) and 1 (positive).
 */
export const analyzeSentiment = (text) => {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  
  let score = 0;
  POSITIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) score += 0.2;
  });
  NEGATIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) score -= 0.3;
  });

  return Math.max(-1, Math.min(1, score));
};

/**
 * Summarizes the text (simulation).
 */
export const summarizeComplaint = (text) => {
  if (!text) return '';
  if (text.length <= 100) return text;
  
  const sentences = text.split(/[.!?]/);
  if (sentences.length > 1) {
    return sentences.slice(0, 2).join('.') + '.';
  }
  return text.substring(0, 97) + '...';
};

/**
 * Suggests a priority level.
 */
export const suggestPriority = (text) => {
  if (!text) return 'Medium';
  const lowerText = text.toLowerCase();
  
  const highPriorityWords = ['urgent', 'immediate', 'emergency', 'danger', 'broken', 'safety', 'ragging', 'raging', 'harassment', 'bullying', 'threat', 'blood', 'injury', 'suicide', 'attack', 'beating', 'fight', 'broken wire', 'short circuit', 'torture', 'intimidation', 'forced', 'shouting', 'abuse', 'fire', 'leakage', 'theft'];
  const lowPriorityWords = ['suggestion', 'idea', 'could be', 'whenever', 'optional', 'not urgent'];

  if (highPriorityWords.some(word => lowerText.includes(word))) return 'High';
  if (lowPriorityWords.some(word => lowerText.includes(word))) return 'Low';
  
  return 'Medium';
};

/**
 * Simulates an AI chat response for common queries.
 */
export const getAiResponse = (message, context = {}) => {
  if (!message) return "I'm here to help!";
  const msg = message.toLowerCase();
  const { items = [], role = 'student' } = context;

  // Context-aware logic
  if (msg.includes('how many') || msg.includes('count') || msg.includes('total')) {
    if (items.length > 0) {
      const pending = items.filter(c => c.status === 'Pending').length;
      const resolved = items.filter(c => c.status === 'Resolved').length;
      const progress = items.filter(c => c.status === 'In Progress').length;
      return `Current stats: Total ${items.length} complaints. Resolved: ${resolved}, In Progress: ${progress}, Pending: ${pending}.`;
    }
  }

  if (msg.includes('most common') || msg.includes('category')) {
    if (items.length > 0) {
      const cats = items.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {});
      const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
      const topCat = sortedCats[0];
      return `The most common issue is '${topCat[0]}' with ${topCat[1]} complaints. Other active categories are: ${sortedCats.slice(1, 3).map(c => c[0]).join(', ')}.`;
    }
  }

  if (msg.includes('latest') || msg.includes('recent')) {
    if (items.length > 0) {
      const latest = items[0];
      return `The latest complaint is "${latest.title}" in the ${latest.category} category, submitted recently. Its current status is ${latest.status}.`;
    }
  }

  if (msg.includes('urgent') || msg.includes('priority')) {
    const highPriority = items.filter(c => c.priority === 'High' && c.status !== 'Resolved');
    if (role === 'admin') {
      return `There are ${highPriority.length} high-priority issues that need your attention. AI recommends focusing on ${highPriority.slice(0, 2).map(c => c.category).join(' and ')} first.`;
    }
    return "For urgent issues, please set the priority to 'High'. Our team prioritizes these for faster resolution.";
  }

  if (msg.includes('status') || msg.includes('track')) {
    if (role === 'admin') {
      const resRate = items.length > 0 ? Math.round((items.filter(c => c.status === 'Resolved').length / items.length) * 100) : 0;
      return `The current system resolution rate is ${resRate}%. High-priority issues are being addressed 30% faster this week.`;
    }
    return "You can check your complaint status in the 'My Complaints' section. AI analysis shows that most 'Resolved' complaints take about 2-3 days.";
  }

  if (msg.includes('efficiency') || msg.includes('performance')) {
    if (role === 'admin') {
      const avgDays = 3.2; // Mock stat
      return `System efficiency is high. Average resolution time is ${avgDays} days. Recommendations: automate category assignment for faster routing.`;
    }
  }

  if (msg.includes('profile') || msg.includes('photo') || msg.includes('pic') || msg.includes('image')) {
    return "To change your profile picture, go to the 'Profile' section (click on your name/avatar in the top right), then click on the 'Edit Profile' button. You can upload a new photo from there.";
  }

  // --- Pro Features: Advanced Reasoning & Summarization ---
  if (msg.includes('summarize') || msg.includes('summary') || msg.includes('brief')) {
    if (items.length > 0) {
      const recent = items.slice(0, 3);
      const summary = recent.map(c => `• ${c.title} (${c.status})`).join('\n');
      return `### 📊 System Summary (Pro)\nHere's a quick overview of recent activity:\n${summary}\n\n**AI Insight:** ${items.filter(c => c.status === 'Pending').length > 5 ? "Action required: High volume of pending tasks detected." : "System is operating within normal parameters."}`;
    }
    return "I need some data to summarize. Once you have complaints, I can provide a Pro-level summary!";
  }

  if (msg.includes('analyze') || msg.includes('reasoning') || msg.includes('insight')) {
    if (role === 'admin' && items.length > 0) {
      const highPrio = items.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
      const avgRes = "2.4 days"; // Simulated
      return `### 🧠 Pro Reasoning Engine\nBased on current data analysis:\n1. **Urgency:** ${highPrio} critical items need immediate attention.\n2. **Trend:** Complaints in 'Hostel' have increased by 15% this week.\n3. **Efficiency:** Average resolution is ${avgRes}, which is 10% faster than last month.\n\n**Recommendation:** Deploy additional staff to Hostel maintenance for 48 hours to clear the backlog.`;
    }
    return "As a Gemini Pro user, you have access to advanced reasoning. Currently, I'm monitoring system health. Everything looks stable! 🚀";
  }

  if (msg.includes('compare') || msg.includes('difference')) {
    return "### ⚖️ Comparative Analysis\nGemini Pro Ultra features include:\n• **Multi-modal Support:** I can process text and (simulated) images.\n• **Deeper Context:** I remember your role as a " + role + ".\n• **Advanced Logic:** I use sentiment analysis to prioritize your requests.\n• **Real-time Sync:** I'm directly connected to the Supabase backend.";
  }

  if (msg.includes('help') || msg.includes('what can you do') || msg.includes('features')) {
    return `### 🌟 Gemini Pro Ultra Features
I am an advanced AI assistant powered by Gemini Pro logic. I can:
1. **Real-time Analytics:** Get instant stats on complaints.
2. **Sentiment Analysis:** I understand the urgency in your tone.
3. **Smart Categorization:** I automatically suggest categories.
4. **Voice Interaction:** Speak to me directly!
5. **Admin Reasoning:** I provide deep insights for administrators.

How can I assist your ${role} workflow today?`;
  }

  if (msg.includes('password') || msg.includes('reset') || msg.includes('change login')) {
    return "You can change your password from the 'Profile' settings. If you forgot your password, please contact the administrator or use the 'Forgot Password' link on the login page.";
  }

  if (msg.includes('delete') || msg.includes('remove') || msg.includes('cancel')) {
    return "Currently, you cannot delete a complaint once submitted to ensure transparency. However, you can 'Cancel' a pending complaint or contact the admin if you made a serious mistake.";
  }

  if (msg.includes('edit') || msg.includes('update') || msg.includes('modify')) {
    return "You can edit your complaint as long as it is still in 'Pending' status. Once the admin starts working on it ('In Progress'), edits are disabled to prevent confusion.";
  }

  if (msg.includes('dark mode') || msg.includes('light mode') || msg.includes('theme') || msg.includes('color')) {
    return "You can toggle between Light and Dark mode using the sun/moon icon in the top navigation bar. System color scheme will change instantly!";
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return "Hello! I'm your AI Assistant. I can help you analyze complaints, change settings, provide system stats, and suggest improvements. How can I help you today?";
  }

  if (msg.includes('how to submit')) {
    return "It's easy! Go to 'New Complaint', type a title, select a category, and describe your issue. I can even help you improve your description automatically!";
  }

  if (msg.includes('who made') || msg.includes('creator') || msg.includes('developer')) {
    return "This Complaint Management System was developed to help students and admins communicate better. I am the AI brain behind it!";
  }

  if (msg.includes('joke') || msg.includes('funny')) {
    return "Why did the computer go to the doctor? Because it had a virus! Haha, jokes aside, I'm here to solve your problems.";
  }

  if (msg.includes('what is this')) {
    return "This is a Complaint Management System where students can report issues like electricity, cleaning, or hostel problems, and admins can track and resolve them in real-time.";
  }

  if (msg.includes('improve') || msg.includes('better') || msg.includes('change')) {
    return "I am constantly learning! You can improve the system by providing detailed descriptions in complaints. I can also help you analyze trends to see where improvements are needed most.";
  }

  if (msg.includes('not working') || msg.includes('issue') || msg.includes('problem')) {
    return "I'm sorry to hear that. Is it a technical issue with the app or a complaint about facilities? You can describe it here, and I'll help you categorize it.";
  }

  if (msg.includes('answer me') || msg.includes('reply')) {
    return "I am here to help! Please ask specifically about complaints, system stats, or how to use the dashboard.";
  }

  if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('priority')) {
    return "For urgent matters like electricity or safety, set the priority to 'High'. These are flagged immediately for admin attention.";
  }

  if (msg.includes('hostel') || msg.includes('room')) {
    return "Hostel issues (water, furniture, cleaning) are usually resolved within 48 hours. Please make sure to provide your room number in the description.";
  }

  if (msg.includes('who are you') || msg.includes('what can you do')) {
    return "I am the Intelligent Complaint Assistant. I can analyze sentiments, predict categories, suggest priorities, and provide real-time system stats.";
  }

  if (msg.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}. Is there anything specific you need help with?`;
  }

  if (msg.includes('date')) {
    return `Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  if (msg.includes('weather')) {
    return "I don't have a real-time weather sensor, but I can tell you it's always a good day to resolve complaints! ☀️";
  }

  // College-specific answers (prioritized)
  if (msg.includes('college name') || msg.includes('college') || msg.includes('institute') || msg.includes('clg')) {
    return "Our college/institute name is **Sterling Institute of Management System**, located in Nerul.";
  }
  
  if (msg.includes('address') || msg.includes('location') || msg.includes('where is')) {
    return "We are located at Sterling Institute of Management System, Nerul, Navi Mumbai, Maharashtra, India.";
  }
  
  if (msg.includes('contact') || msg.includes('phone') || msg.includes('mobile') || msg.includes('call') || msg.includes('number')) {
    return "Our contact number is +91-9004971944. You can reach out for any queries or concerns during office hours.";
  }
  
  if (msg.includes('email') || msg.includes('mail')) {
    return "Our official email for admin queries is admin@gmail.com.";
  }
  
  if (msg.includes('categories')) {
    return "We have the following complaint categories: Academic, Administrative, Facilities, Faculty, Hostel, Library, Transportation, Electricity, Cleaning, Ragging, and Other. You can select any of these while submitting your complaint.";
  }
  
  if (msg.includes('how to use')) {
    return "**How to use ComplaintHub:\n1. Register/Login to your account.\n2. Go to Dashboard → 'Submit New Complaint'.\n3. Fill in title, description, select appropriate category and priority.\n4. You can also add photos and your location for faster resolution.\n5. Submit and track your complaint status in 'My Complaints' section!";
  }
  
  if (msg.includes('how are you')) {
    return "I'm doing great, thank you for asking! I'm ready to help you manage your complaints.";
  }

  if (msg.includes('thank')) {
    return "You're very welcome! I'm always happy to assist. Is there anything else?";
  }

  // Fallback with more suggestions
  return "I've analyzed your message but I'm not 100% sure. Try asking about:\n• 'How to change profile pic'\n• 'Check my complaint status'\n• 'How to submit new complaint'\n• 'Total counts' (if admin)\n• 'Dark mode settings'";
};

/**
 * Generates a professional remark suggestion for admins.
 */
export const suggestRemark = (complaint) => {
  if (!complaint) return "Thank you for your feedback.";
  const { category, description } = complaint;
  const sentiment = analyzeSentiment(description || '');

  if (category === 'Electricity') {
    return "We have received your complaint regarding electricity. An electrician has been assigned and the issue will be fixed shortly.";
  }
  if (category === 'Cleaning') {
    return "The cleaning staff has been notified about this. We apologize for the inconvenience and will ensure it's cleaned today.";
  }
  if (category === 'Ragging') {
    return "This is a serious matter. The anti-ragging committee has been alerted and strict action will be taken immediately.";
  }
  
  if (sentiment < -0.5) {
    return "We understand your frustration and are prioritizing this issue. Our team is working on it and we will update you soon.";
  }

  return "Thank you for bringing this to our attention. We are looking into it and will resolve it as soon as possible.";
};

/**
 * Improves a complaint description (simulation).
 */
export const improveDescription = (text) => {
  if (!text || text.length < 5) return text;
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('fan') && lowerText.includes('not working')) {
    return "I am reporting that the ceiling fan in my room is not operational. It stopped working recently, causing discomfort due to the heat. Please arrange for a technician to inspect and repair it as soon as possible.";
  }
  if (lowerText.includes('water') && (lowerText.includes('leak') || lowerText.includes('tap'))) {
    return "There is a significant water leakage issue in the washroom area. This is causing water wastage and creating a slippery surface, which is a safety hazard. Requesting immediate plumbing assistance to fix the leak.";
  }
  if (lowerText.includes('exam') || lowerText.includes('grade')) {
    return "I would like to raise a concern regarding my recent academic results. I believe there might be a discrepancy in the grading process for my latest assignment/exam. I request a re-evaluation or clarification on the marks awarded.";
  }
  if (lowerText.includes('wifi') || lowerText.includes('internet')) {
    return "The internet connectivity in the hostel premises is extremely unstable and slow. This is severely impacting my ability to access online learning resources and complete assignments. Requesting the IT department to look into this and improve the bandwidth.";
  }

  return `The following issue needs attention: ${text}. It is affecting daily activities and requires a prompt resolution from the concerned department.`;
};

/**
 * Generates a complete description based on title and category.
 */
export const generateDescription = (title, category) => {
  const lowerTitle = (title || '').toLowerCase();
  
  if (category === 'Electricity' || lowerTitle.includes('light') || lowerTitle.includes('fan') || lowerTitle.includes('power')) {
    return `I am writing to report an issue with the electrical fixtures. ${title ? `Specifically: ${title}. ` : ''}The problem started recently and is causing significant inconvenience. I request the maintenance team to inspect and resolve this as soon as possible.`;
  }
  if (category === 'Cleaning' || lowerTitle.includes('dirty') || lowerTitle.includes('waste') || lowerTitle.includes('dust')) {
    return `I would like to bring to your attention the lack of cleanliness. ${title ? `The issue is: ${title}. ` : ''}This is affecting the hygiene of the environment. I request the cleaning staff to address this matter immediately.`;
  }
  if (category === 'Hostel' || lowerTitle.includes('room') || lowerTitle.includes('bed')) {
    return `I am facing an issue in the hostel premises. ${title ? `Detail: ${title}. ` : ''}This is impacting my stay and study environment. I request the hostel warden to look into this and provide a solution.`;
  }
  if (category === 'Academic' || lowerTitle.includes('class') || lowerTitle.includes('teacher') || lowerTitle.includes('exam')) {
    return `I wish to raise an academic-related concern. ${title ? `Subject: ${title}. ` : ''}This is affecting my learning progress. I request the department head to provide guidance or a resolution on this matter.`;
  }
  if (category === 'Ragging') {
    return `I am reporting a serious case of harassment/ragging. ${title ? `Incident: ${title}. ` : ''}This is causing severe mental and physical distress. I request the anti-ragging committee to take immediate and strict action.`;
  }

  return `I would like to file a complaint regarding: ${title || 'this issue'}. It has been persistent for some time and needs urgent attention from the respective department. Looking forward to a quick resolution.`;
};
