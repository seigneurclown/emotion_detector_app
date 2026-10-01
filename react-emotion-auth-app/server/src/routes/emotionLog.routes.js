import { Router } from 'express';
import prisma from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Protect all emotion-logs routes
router.use(authMiddleware);

// POST /api/emotion-logs - Save detected emotion log
router.post('/', async (req, res) => {
  try {
    const { detectedEmotion, confidenceScore, snapshotUrl } = req.body;

    if (!detectedEmotion || confidenceScore === undefined) {
      return res.status(400).json({ message: 'detectedEmotion and confidenceScore are required' });
    }

    const log = await prisma.emotionLog.create({
      data: {
        userId: req.user.id,
        detectedEmotion,
        confidenceScore: parseFloat(confidenceScore),
        snapshotUrl: snapshotUrl || null,
      },
    });

    return res.status(201).json({
      message: 'Emotion log saved successfully',
      log,
    });
  } catch (error) {
    console.error('Error saving emotion log:', error);
    return res.status(500).json({ message: 'Failed to save emotion log', error: error.message });
  }
});

// GET /api/emotion-logs - Retrieve user's emotion history & stats
router.get('/', async (req, res) => {
  try {
    const { emotion, limit = 50, page = 1 } = req.query;
    const take = parseInt(limit, 10) || 50;
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const where = {
      userId: req.user.id,
      ...(emotion ? { detectedEmotion: emotion } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.emotionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.emotionLog.count({ where }),
    ]);

    // Aggregate statistics across all logs of this user
    const allUserLogs = await prisma.emotionLog.findMany({
      where: { userId: req.user.id },
      select: { detectedEmotion: true, confidenceScore: true },
    });

    const emotionCounts = {};
    let totalConfidence = 0;

    for (const item of allUserLogs) {
      emotionCounts[item.detectedEmotion] = (emotionCounts[item.detectedEmotion] || 0) + 1;
      totalConfidence += item.confidenceScore;
    }

    let topEmotion = null;
    let maxCount = 0;
    for (const [em, cnt] of Object.entries(emotionCounts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        topEmotion = em;
      }
    }

    const stats = {
      totalDetections: allUserLogs.length,
      averageConfidence: allUserLogs.length > 0 ? Number((totalConfidence / allUserLogs.length).toFixed(2)) : 0,
      mostFrequentEmotion: topEmotion,
      breakdown: emotionCounts,
    };

    return res.json({
      logs,
      total,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / take),
      stats,
    });
  } catch (error) {
    console.error('Error fetching emotion logs:', error);
    return res.status(500).json({ message: 'Failed to fetch emotion logs', error: error.message });
  }
});

// DELETE /api/emotion-logs/:id - Delete an emotion log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.emotionLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ message: 'Emotion log not found' });
    }

    if (log.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this log' });
    }

    await prisma.emotionLog.delete({ where: { id } });

    return res.json({ message: 'Log deleted successfully', id });
  } catch (error) {
    console.error('Error deleting emotion log:', error);
    return res.status(500).json({ message: 'Failed to delete emotion log', error: error.message });
  }
});

export default router;
