# DeepSpace App Guide

This guide explains what DeepSpace is and what users can do with it. Use this to answer user questions about app features and capabilities.

## What is DeepSpace?

DeepSpace is a collaborative canvas workspace where users build personalized workflows using interactive widgets. Think of it as an infinite whiteboard where each element is a mini-app that can display data, connect to external services, and communicate with other widgets.

**Key concepts:**
- **Canvas**: A workspace where widgets are placed and arranged
- **Widgets**: Interactive components (built with React) that run in isolation
- **Connections**: Links between widgets that allow data to flow from one to another
- **Integrations**: External services (Gmail, GitHub, weather, etc.) that widgets can access
- **AI Agent**: An assistant that helps build, modify, and connect widgets

## Key Features

### Create and Organize Canvases
- Create multiple canvases for different projects
- Organize work into separate workspaces
- Share canvases for real-time collaboration

### Add Widgets
- Place interactive widgets on the canvas
- Choose from many pre-built widget types
- Ask the AI to create custom widgets

### Connect Widgets
- Draw connections between widgets to create data pipelines
- Output from one widget becomes input for another
- Build automated workflows

### Use Integrations
- Access 24+ external services directly from widgets
- Search the web, send emails, check weather, and more
- OAuth-protected services (Gmail, Calendar) require one-time authorization

### AI Assistance
- Ask the AI to create new widgets
- Request modifications to existing widgets
- Get help connecting widgets and building workflows

## Widget Categories

### Productivity
- **Notes/Notepad** - Take notes, write documents
- **Task Manager** - Track tasks and to-dos
- **Project Manager** - Manage projects with boards/lists
- **Slide Deck** - Create presentations
- **Spreadsheet** - Work with tabular data
- **Calendar Planner** - Schedule and plan events
- **PDF Generator** - Create PDF documents

### Communication & Outreach
- **Email Composer** - Draft and send emails via Gmail
- **LinkedIn Search** - Find LinkedIn profiles
- **LinkedIn Message Generator** - Create outreach messages
- **LinkedIn Analyzer** - Analyze profiles for insights

### Research & Information
- **Web Search** - Search the internet
- **Scholar Search** - Find academic papers
- **Wikipedia** - Look up encyclopedia articles
- **News** - Get headlines and search news articles

### Travel & Local
- **Flight Finder** - Search for flights
- **Hotel Search** - Find accommodations (via travel integration)
- **Restaurant Finder** - Discover places to eat
- **Attraction Finder** - Find things to do
- **Weather** - Check current conditions and forecasts
- **Itinerary Organizer** - Plan trip schedules

### Finance & Markets
- **Markets Ticker** - Track stocks and crypto
- **Polymarket** - View prediction market odds
- **Amazon Search** - Find products on Amazon

### Media & Creative
- **Image Generation** - Create images from text prompts
- **Video Generation** - Generate videos from images
- **YouTube Search** - Find and explore videos
- **TikTok** - Post videos to TikTok
- **Text-to-Speech** - Convert text to audio
- **Speech-to-Text** - Transcribe audio

### Developer Tools
- **GitHub** - Browse repos, commits, PRs, issues
- **Google Drive** - Upload, download, manage files

### CRM & Sales
- **Lead Pipeline** - Track sales leads
- **Contact Directory** - Manage contacts
- **Activity Logger** - Log sales activities
- **Email Campaign** - Manage email outreach

### Fun & Games
- **2048 Game** - Play the puzzle game
- **Texas Poker** - Card game
- **Spyfall** - Party game
- **Soccer tools** - Team maker, scheduling

### Health & Lifestyle
- **Nutrition Tracker** - Track meals and nutrition
- **Meal Recommendations** - Get food suggestions
- **Plant Tracker** - Track plant care

### Specialized
- **Formula 1** - Race results, standings, lap times
- **NASA** - Astronomy pictures, asteroid data, space weather

## Available Integrations

DeepSpace connects to 24+ external services:

### Search & Information
- **Web Search** - General web search, AI-summarized results, PDF search
- **Image/Video Search** - Find images and videos
- **Wikipedia** - Summaries, full articles, search
- **News** - Top headlines, article search
- **Scholar** - Academic papers, authors, citations

### Communication
- **Gmail** - Send emails, reply to threads, manage inbox
- **Google Contacts** - Access contact list
- **Google Drive** - Upload, download, list files
- **LinkedIn** - Search profiles, analyze, generate messages
- **TikTok** - Post videos

### Calendar & Events
- **Google Calendar** - View events, create events

### Media Generation
- **Image Generation** - Multiple AI models (Classic, Mystic, Flux, GPT)
- **Image Editing** - Background removal, upscaling, relighting, style transfer
- **Text-to-Speech** - Convert text to audio
- **Speech-to-Text** - Transcribe audio
- **Video Generation** - Create videos from images

### Finance & Markets
- **Stock Search** - Find stock symbols and data
- **Crypto Search** - Find cryptocurrency info
- **Polymarket** - Prediction market events, prices, history

### Travel
- **Flights** - Search flight options
- **Hotels** - Find accommodations
- **Places** - Discover attractions and restaurants
- **Events** - Find local events

### Science & Research
- **NASA** - Astronomy Picture of the Day, asteroid tracking, space weather
- **Scholar** - Google Scholar papers and citations

### Sports
- **Formula 1** - Season schedules, race results, standings, lap times

### Weather
- **Current Weather** - Real-time conditions
- **Forecasts** - Multi-day predictions
- **Geocoding** - Location lookup

### Shopping
- **Amazon** - Product search

### Developer
- **GitHub** - Repos, commits, PRs, issues, file contents

## Common Workflows

### Build a Research Dashboard
1. Add a web search widget for general research
2. Add a notepad for capturing findings
3. Add Scholar search for academic sources
4. Connect search results to flow into notes

### Plan a Trip
1. Add flight finder to search routes
2. Add weather widget for destination
3. Add attraction finder for activities
4. Add itinerary organizer to compile the plan

### Track Markets
1. Add markets ticker widget
2. Configure with symbols to watch
3. Add news widget filtered to financial news

### Email Outreach Campaign
1. Add LinkedIn search to find prospects
2. Add LinkedIn analyzer to understand profiles
3. Add LinkedIn message generator for personalized outreach
4. Add email composer to send follow-ups

### Create a Presentation
1. Add slide deck widget
2. Ask AI to generate content
3. Add image generation for custom visuals
4. Present directly or export

### Monitor Sports
1. Add F1 results widget for race data
2. Add standings tracker
3. Add news widget for sports headlines

## How Widgets Communicate

**Shared Storage**: Widgets can share data across the canvas using global storage. Multiple widgets can read from and write to the same data.

**Connected Widgets**: Draw a connection from one widget's output to another's input. Data flows through the connection automatically.

**Independent Mode**: Each widget can also work completely standalone without any connections.

## Getting Help from the AI

The AI agent can help you with:

- "Create a widget that does X"
- "Connect these two widgets"
- "Show me what integrations are available"
- "Help me build a workflow for X"
- "What can I do with this app?"
- "How do I use [specific feature]?"
- "Modify this widget to add [feature]"
- "What widgets would help me with [goal]?"

The AI will create, modify, and connect widgets based on your requests. Just describe what you want to accomplish.
