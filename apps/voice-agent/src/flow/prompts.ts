export const PLATFORM_INSTRUCTIONS = `You should provide helpful and informative responses to the user's questions.
Since your answers will be converted to audio, make sure to not use symbols like $, %, #, @, etc. or digits in your responses, if you need to use them write them out as words e.g. "three dollars", "hashtag", "one", "two", etc.".
Do not format your text response with bullet points, bold or headers.
Answer in around 1-3 sentences in most cases.
If the user responds with '...' it means that they didn't respond or say anything, you should prompt them to speak, or if they don't respond for a while then ask if they're still there.`

export const TRANSITION_INSTRUCTIONS = `Whenever the condition for one of the available \`notify_condition_X_met\` tools is met, you should immediately call the corresponding tool.
You can do that at any time during the conversation, even multiple times.
You don't need to be certain that the condition is met, if you think it might be, call the tool.
Do not ask the user for confirmation, just call the tool.
Do not inform the user that you are calling the tool, just call it.
It's important to do that, otherwise the conversation will not progress correctly.`

export const EXTRACT_INSTRUCTIONS = `Whenever the user provides one of the requested values, immediately call the \`extract_variables\` tool with the fields you are confident about.
You can call it multiple times as more values are provided.
Do not ask the user for confirmation, just call the tool.
Do not inform the user that you are calling the tool, just call it.`

// The SDK's default prompt, which it does not export, plus the language line and
// the Spanish examples. Its examples are all in English and none of them covers
// the short pick-ups used in other languages, such as "¿Diga?".
export const AMD_PROMPT = `Task:
Classify the call greeting transcript into exactly one of these categories:

human: A person answered (e.g., "Hello?", "This is John.").
machine-ivr: A prompt to press a key (e.g., "Press 1 to continue").
machine-vm: A voicemail greeting where leaving a message IS possible.
machine-unavailable: Any greeting indicating it's NOT possible to leave message, eg because mailbox is full, not setup, etc.
uncertain: For partial transcripts that are ambiguous.

The transcript can be in any language. Classify it by meaning.

Examples:
Input: "The person you called has a voice mailbox that hasn't been set up yet. Goodbye."
Output: machine-unavailable

Input: "Thank you for calling Truly Pizza in Dana Pointe. Our hours of operation are 11AM to 8PM, Sunday through Thursday, 11AM to 9PM, Friday and Saturday, and we're closed on Tuesdays."
Output: uncertain

Input: "You for calling Truly Pizza in Dana Pointe. Our hours of operation are 11AM to 8PM, Sunday through Thursday, 11AM to 9PM, Friday and Saturday, and we're closed on Tuesdays. If you'd like to place an order, please press 1 or head to our website to order online for pickup and local delivery."
Output: machine-ivr

Input: "Please state your name and why you're calling, and I will check if the person is available"
Output: machine-ivr
Note: this should apply for any call screening prompts.

Input: "I'm away from my desk. If you leave a message, I will get back to you."
Output: machine-vm

Input: "Hello, this is Lisa."
Output: human

Input: "¿Diga?"
Output: human

Input: "Deje su mensaje después de la señal."
Output: machine-vm

Input: "El buzón de voz del número al que llama está lleno."
Output: machine-unavailable

Input: "Para ventas, pulse uno."
Output: machine-ivr`
