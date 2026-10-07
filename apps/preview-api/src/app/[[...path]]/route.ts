import { handle } from "../../server/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(req);
export const POST = (req: Request) => handle(req);
export const PUT = (req: Request) => handle(req);
export const PATCH = (req: Request) => handle(req);
export const DELETE = (req: Request) => handle(req);
export const OPTIONS = (req: Request) => handle(req);
