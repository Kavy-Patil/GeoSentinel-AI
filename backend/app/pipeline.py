"""
GeoSentinel AI Pipeline Architecture Stub.
In future stages (Stage 2-4), this module will orchestrate preprocessing,
detection algorithm execution, spatial polygonization, and metric calculation.
"""

from typing import Optional
from app.schemas import DetectionMethod, Job, JobStatus


class PipelineManager:
    """
    Orchestration stub for satellite change detection pipelines.
    No fake or simulated processing is executed in Stage 1.
    """

    def __init__(self):
        self.stage = 1

    def is_method_available(self, method: DetectionMethod) -> bool:
        """In Stage 1, no detection methods are available."""
        return False

    async def execute_job(self, job_id: str, method: DetectionMethod) -> Optional[Job]:
        """Placeholder for future stage pipeline execution."""
        raise NotImplementedError(
            "Change detection pipeline execution is scheduled for Stage 2 & 3."
        )
