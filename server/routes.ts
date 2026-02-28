import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/teams", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, category, logo_url, color1, color2, captain_name, coach_name, season, status
         FROM teams
         ORDER BY name ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching teams:", err);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT id, name, category, logo_url, color1, color2, captain_name, coach_name, season, status
         FROM teams WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching team:", err);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, home_team, away_team, home_score, away_score, game_date, game_time,
                venue, category, status, season, stage, jornada
         FROM games
         ORDER BY game_date DESC, game_time DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching games:", err);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/team-stats", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT team_name, team_category, season, games_played, games_won, games_lost,
                games_tied, points_for, points_against, points
         FROM team_stats
         ORDER BY points DESC, games_won DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching team stats:", err);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
