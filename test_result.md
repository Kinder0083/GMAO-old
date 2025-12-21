# Test Results - AI Chatbot P2 & P3

## Testing Protocol
Testing AI Chatbot enhancements for GMAO Iris

## Features to Test

### P0 - Installation Script Fix
- [ ] Verify script syntax is valid (bash -n)
- [ ] Verify Nginx configuration section is corrected

### P2 - AI Chatbot Advanced Context
- [ ] Test `/api/ai/context` endpoint returns enriched app context
- [ ] Verify context includes: active_work_orders, urgent_work_orders, equipment_in_maintenance, active_alerts, sensors_in_alert
- [ ] Test chat with `include_app_context: true` uses context in responses
- [ ] Verify AI can be proactive based on context (e.g., mentioning urgent OTs)

### P3 - AI Chatbot Advanced Visual Guidance
- [ ] Test [[NAVIGATE:xxx]] commands work
- [ ] Test [[ACTION:xxx]] commands work (navigate + highlight)
- [ ] Test [[GUIDE:xxx]] commands start guided tutorials
- [ ] Test [[SPOTLIGHT:selector]] effect
- [ ] Test [[PULSE:selector]] effect
- [ ] Test [[CELEBRATE]] confetti effect
- [ ] Verify visual effects render without errors

## Test Credentials
- Email: admin@test.com
- Password: password

## API Endpoints
- GET /api/ai/context - Get enriched app context
- POST /api/ai/chat - Chat with AI (include_app_context param)
- GET /api/ai/providers - List available LLM providers

## Incorporate User Feedback
None yet.
