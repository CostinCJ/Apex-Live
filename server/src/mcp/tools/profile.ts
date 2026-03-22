import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

export function registerProfileTools(server: McpServer): void {

  // ── get_fitness_profile ──────────────────────────────────────────
  server.tool(
    'get_fitness_profile',
    'Get the user fitness profile including fitness level, body metrics, preferences, and voice coaching settings.',
    {
      userId: z.string().uuid().describe('User ID'),
    },
    async ({ userId }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, displayName: true, fitnessLevel: true,
          heightCm: true, weightKg: true, units: true,
          preferences: true, voiceSettings: true, timezone: true,
        },
      });
      if (!user) {
        return { content: [{ type: 'text', text: 'Error: User not found' }], isError: true };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(user) }],
      };
    },
  );

  // ── update_fitness_profile ───────────────────────────────────────
  server.tool(
    'update_fitness_profile',
    'Update user fitness profile settings (fitness level, body metrics, units, preferences).',
    {
      userId: z.string().uuid().describe('User ID'),
      fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      heightCm: z.number().min(50).max(300).optional(),
      weightKg: z.number().min(20).max(500).optional(),
      units: z.enum(['metric', 'imperial']).optional(),
      coachingStyle: z.enum(['motivational', 'technical', 'balanced']).optional(),
      verbosity: z.enum(['minimal', 'moderate', 'verbose']).optional(),
    },
    async ({ userId, fitnessLevel, heightCm, weightKg, units, coachingStyle, verbosity }) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return { content: [{ type: 'text', text: 'Error: User not found' }], isError: true };
      }

      const data: Record<string, unknown> = {};
      if (fitnessLevel) data.fitnessLevel = fitnessLevel;
      if (heightCm) data.heightCm = heightCm;
      if (weightKg) data.weightKg = weightKg;
      if (units) data.units = units;

      // Update nested voice settings
      if (coachingStyle || verbosity) {
        const current = (user.voiceSettings as Record<string, unknown>) ?? {};
        if (coachingStyle) current.coaching_style = coachingStyle;
        if (verbosity) current.verbosity = verbosity;
        data.voiceSettings = current;
      }

      const updated = await prisma.user.update({ where: { id: userId }, data });

      return {
        content: [{ type: 'text', text: JSON.stringify({ updated: true, fitnessLevel: updated.fitnessLevel, units: updated.units }) }],
      };
    },
  );
}
