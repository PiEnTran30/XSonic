import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingAdapter } from "@xsonic/core";
import {
  processCutJoin,
  processVolume,
  processPitchTempo,
  processFormatConversion,
} from "@/lib/processors/audio-processors";
import { processVideoDownload } from "@/lib/processors/video-processors";
import { processOnlineRecorder } from "@/lib/processors/recorder-processor";
import {
  processAutoSubtitle,
  processAudioEnhance,
  processStemSplitter,
  processDeReverb,
} from "@/lib/processors/ai-processors";

/**
 * Worker API endpoint to process jobs
 * This endpoint is called by a background worker (cron job, separate service, etc.)
 * to pick up pending jobs and process them
 *
 * Can also be called with specific jobId to process a single job immediately
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Parse request body
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty or invalid JSON
    }
    const { jobId } = body;

    // If jobId is provided, process that specific job (no auth required for immediate processing)
    if (jobId) {
      const { data: job, error: fetchError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError || !job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      // Process the job asynchronously (don't wait for completion)
      processJob(job, supabase).catch((err) => {
        console.error(`Job ${job.id} processing error:`, err);
      });

      return NextResponse.json({
        success: true,
        message: "Job processing started",
        jobId: job.id,
      });
    }

    // Otherwise, process pending jobs (requires auth)
    const authHeader = request.headers.get("authorization");
    const workerToken = process.env.WORKER_SECRET_TOKEN || "dev-worker-token";

    if (authHeader !== `Bearer ${workerToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get pending jobs (limit 10 at a time)
    const { data: jobs, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Fetch jobs error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch jobs" },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs",
        processed: 0,
      });
    }

    const results = [];

    // Process each job
    for (const job of jobs) {
      try {
        // Update status to processing
        await supabase
          .from("jobs")
          .update({ status: "processing" })
          .eq("id", job.id);

        // Process based on tool_id
        const result = await processJob(job, supabase);

        results.push({
          jobId: job.id,
          success: result.success,
          message: result.message,
        });
      } catch (err: any) {
        console.error(`Job ${job.id} processing error:`, err);
        
        // Update job status to failed
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: err.message || "Processing failed",
          })
          .eq("id", job.id);

        results.push({
          jobId: job.id,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Process jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process jobs" },
      { status: 500 }
    );
  }
}

/**
 * Process a single job based on tool_id
 */
async function processJob(job: any, supabase: any) {
  const toolId = job.tool_id;

  // Route to appropriate processor
  switch (toolId) {
    case "audio-cut-join":
    case "cut-join":
      return await processCutJoinJob(job, supabase);

    case "volume-normalize":
      return await processVolumeJob(job, supabase);

    case "pitch-tempo":
      return await processPitchTempoJob(job, supabase);

    case "online-recorder":
      return await processOnlineRecorderJob(job, supabase);

    case "video-downloader":
      return await processVideoDownloadJob(job, supabase);

    // AI-powered tools using Gemini
    case "auto-subtitle":
      return await processAutoSubtitleJob(job, supabase);

    case "audio-enhance":
      return await processAudioEnhanceJob(job, supabase);

    case "stem-splitter":
      return await processStemSplitterJob(job, supabase);

    case "de-reverb":
      return await processDeReverbJob(job, supabase);

    default:
      throw new Error(`Tool ${toolId} not implemented yet`);
  }
}

/**
 * Helper function to deduct credits when job completes
 */
async function deductJobCredits(job: any, actualCredits: number) {
  try {
    const billing = new BillingAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await billing.deductCredits(
      job.user_id,
      actualCredits,
      `Job ${job.id} - ${job.tool_id}`,
      "job",
      job.id
    );

    console.log(`[Credits] Deducted ${actualCredits} credits for job ${job.id}`);
  } catch (err: any) {
    console.error(`[Credits] Failed to deduct credits for job ${job.id}:`, err);
    // Don't throw - job should complete even if credit deduction fails
  }
}

/**
 * Process Cut/Join job
 */
async function processCutJoinJob(job: any, supabase: any) {
  const { outputUrl } = await processCutJoin(job);

  const resultFileName = `result_${job.id}.mp3`;
  const actualCredits = job.cost_estimate || 0.5;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_path: resultFileName,
      output_file_url: outputUrl,
      cost_actual: actualCredits,
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Audio cut/join completed",
  };
}

/**
 * Process Volume job
 */
async function processVolumeJob(job: any, supabase: any) {
  const { outputUrl } = await processVolume(job);
  const actualCredits = job.cost_estimate || 0.5;

  const resultFileName = `result_${job.id}.mp3`;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_path: resultFileName,
      output_file_url: outputUrl,
      cost_actual: actualCredits,
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Volume adjustment completed",
  };
}

/**
 * Process Pitch/Tempo job
 */
async function processPitchTempoJob(job: any, supabase: any) {
  const { outputUrl } = await processPitchTempo(job);
  const actualCredits = job.cost_estimate || 0.5;

  const resultFileName = `result_${job.id}.mp3`;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_path: resultFileName,
      output_file_url: outputUrl,
      cost_actual: actualCredits,
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Pitch/tempo adjustment completed",
  };
}

/**
 * Process Video Download job
 */
async function processVideoDownloadJob(job: any, supabase: any) {
  // Update to processing
  await supabase
    .from("jobs")
    .update({
      status: "processing",
      progress: 0,
      progress_message: "Starting download...",
    })
    .eq("id", job.id);

  const result = await processVideoDownload(
    job,
    async (progress: number, message: string) => {
      // Update progress in real-time
      console.log(`[Job ${job.id}] Progress: ${progress}% - ${message}`);

      const { error } = await supabase
        .from("jobs")
        .update({
          progress: Math.floor(progress),
          progress_message: message,
        })
        .eq("id", job.id);

      if (error) {
        console.error(`[Job ${job.id}] Failed to update progress:`, error);
      }
    }
  );

  const { outputUrl, title, driveFileId, downloadUrl, localPath, storageType, storagePath, uploadFailed, uploadError } = result;

  const resultFileName = `video_${job.id}.${job.metadata.format || 'mp3'}`;
  const actualCredits = job.cost_estimate || 2;

  // Determine final status and message
  let finalMessage = "Download complete";
  if (uploadFailed) {
    finalMessage = `Download complete (Upload failed: ${uploadError})`;
  } else if (storageType === "supabase") {
    finalMessage = "Download complete - Uploaded to Supabase Storage";
  } else if (storageType === "drive") {
    finalMessage = "Download complete - Uploaded to Google Drive";
  }

  await supabase
    .from("jobs")
    .update({
      status: "completed", // Always mark as completed if download succeeded
      progress: 100,
      progress_message: finalMessage,
      output_file_path: resultFileName,
      output_file_url: downloadUrl, // Cloud link or local path
      cost_actual: actualCredits,
      metadata: {
        ...job.metadata,
        video_title: title,
        storage_type: storageType,
        storage_path: storagePath,
        cloud_view_link: outputUrl,
        cloud_download_link: downloadUrl,
        local_path: localPath,
        upload_failed: uploadFailed,
        upload_error: uploadError,
        // Legacy fields for backward compatibility
        drive_file_id: driveFileId,
        drive_view_link: outputUrl,
        drive_download_link: downloadUrl,
      },
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: finalMessage,
  };
}

/**
 * Process Auto Subtitle job
 */
async function processAutoSubtitleJob(job: any, supabase: any) {
  const { outputUrl, srtContent } = await processAutoSubtitle(job);
  const actualCredits = job.cost_estimate || 2;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_url: outputUrl,
      cost_actual: actualCredits,
      metadata: {
        ...job.metadata,
        srt_content: srtContent,
      },
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Auto subtitle completed",
  };
}

/**
 * Process Audio Enhance job
 */
async function processAudioEnhanceJob(job: any, supabase: any) {
  const { outputUrl, analysis } = await processAudioEnhance(job);
  const actualCredits = job.cost_estimate || 3;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_url: outputUrl,
      cost_actual: actualCredits,
      metadata: {
        ...job.metadata,
        analysis: analysis,
      },
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Audio enhance completed",
  };
}

/**
 * Process Stem Splitter job
 */
async function processStemSplitterJob(job: any, supabase: any) {
  const { outputUrls, analysis } = await processStemSplitter(job);
  const actualCredits = job.cost_estimate || 5;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      cost_actual: actualCredits,
      metadata: {
        ...job.metadata,
        output_urls: outputUrls,
        analysis: analysis,
      },
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "Stem separation completed",
  };
}

/**
 * Process De-Reverb job
 */
async function processDeReverbJob(job: any, supabase: any) {
  const { outputUrl, analysis } = await processDeReverb(job);
  const actualCredits = job.cost_estimate || 3;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_url: outputUrl,
      cost_actual: actualCredits,
      metadata: {
        ...job.metadata,
        analysis: analysis,
      },
    })
    .eq("id", job.id);

  // Deduct credits
  await deductJobCredits(job, actualCredits);

  return {
    success: true,
    message: "De-reverb completed",
  };
}

/**
 * GET endpoint to check worker status
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Get job statistics
  const { data: stats } = await supabase
    .from("jobs")
    .select("status")
    .then(({ data }) => {
      const counts = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      data?.forEach((job: any) => {
        if (counts.hasOwnProperty(job.status)) {
          counts[job.status as keyof typeof counts]++;
        }
      });

      return { data: counts };
    });

  return NextResponse.json({
    success: true,
    stats,
    message: "Worker is running",
  });
}

/**
 * Process Online Recorder job
 */
async function processOnlineRecorderJob(job: any, supabase: any) {
  const { outputUrl } = await processOnlineRecorder(job);
  const actualCredits = job.cost_estimate || 0;

  const resultFileName = `result_${job.id}.mp3`;

  await supabase
    .from("jobs")
    .update({
      status: "completed",
      output_file_path: resultFileName,
      output_file_url: outputUrl,
      cost_actual: actualCredits,
    })
    .eq("id", job.id);

  // Deduct credits (if any)
  if (actualCredits > 0) {
    await deductJobCredits(job, actualCredits);
  }

  return {
    success: true,
    message: "Online recorder job completed",
  };
}

