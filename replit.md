# Liga Durango - Sports League App

## Overview
A premium sports league mobile app built with Expo React Native, inspired by ESPN/NFL style apps. Displays teams, matches, and standings from a Supabase PostgreSQL database.

## Architecture

### Frontend (Expo React Native)
- **Routing**: Expo Router (file-based)
- **State Management**: React Query (`@tanstack/react-query`)
- **UI**: Custom components with `expo-linear-gradient`, `expo-image`
- **Fonts**: Inter (via `@expo-google-fonts/inter`)
- **Icons**: `@expo/vector-icons`

### Backend (Express)
- **Server**: Express.js on port 5000
- **Database**: PostgreSQL via `pg` package (DATABASE_URL env var)
- **API Routes**: `/api/teams`, `/api/games`, `/api/team-stats`

### Database Tables (Supabase PostgreSQL)
- `teams`: id, name, category, logo_url, color1, color2, captain_name, coach_name, season, status
- `games`: id, home_team, away_team, home_score, away_score, game_date, game_time, venue, category, status, season, stage, jornada
- `team_stats`: team_name, team_category, season, games_played, games_won, games_lost, games_tied, points_for, points_against, points

## App Screens
- **Home** (`app/(tabs)/index.tsx`): Hero match, recent/upcoming scroll, standings preview
- **Teams** (`app/(tabs)/teams.tsx`): Searchable team list with rich cards
- **Matches** (`app/(tabs)/matches.tsx`): Filter by status (live/finished/upcoming)
- **Standings** (`app/(tabs)/standings.tsx`): Full table with category filter
- **Team Detail** (`app/team/[id].tsx`): Gradient header, stats, player info
- **Match Detail** (`app/match/[id].tsx`): Score display, venue, result

## Components
- `TeamLogo`: Handles logo_url with fallback
- `TeamCard`: Rich card with gradient and team colors
- `MatchCard`: Compact, hero, and full variants
- `LiveBadge`: Animated live indicator
- `StandingsTable`: Points table with top-3 medals
- `SkeletonLoader`: Shimmer loading states

## Hooks
- `useTeams`, `useTeam`: Fetch teams from `/api/teams`
- `useMatches`, `useRecentMatches`, `useUpcomingMatches`, `useLiveMatches`: Fetch games
- `useStats`: Fetch team standings

## Design
- Dark sports aesthetic: navy `#0A0E1A`, red `#E8192C`, card `#1C2537`
- ESPN/NFL inspired visual style
- Team color gradients throughout
- Soft shadows, rounded corners (16-20px), depth layers

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `EXPO_PUBLIC_DOMAIN`: Set by Replit for API URL
