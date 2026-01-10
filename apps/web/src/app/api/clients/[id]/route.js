import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";

// GET /api/clients/[id] - Get client details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    const client = await getOne(
      "SELECT id, first_name, last_name, email, phone, gender, date_of_birth, address, city, postal_code, created_at FROM users WHERE id = ?",
      [id]
    );

    if (!client) {
      return notFound("Client not found");
    }

    let salonData = null;
    if (salonId) {
      salonData = await getOne(
        "SELECT * FROM salon_clients WHERE salon_id = ? AND client_id = ?",
        [salonId, id]
      );
    }

    return success({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      gender: client.gender,
      dateOfBirth: client.date_of_birth,
      address: client.address,
      city: client.city,
      postalCode: client.postal_code,
      notes: salonData?.notes || null,
      createdAt: client.created_at,
      salonStats: salonData
        ? {
            firstVisitDate: salonData.first_visit_date,
            lastVisitDate: salonData.last_visit_date,
            totalVisits: salonData.total_visits,
          }
        : null,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Get client error:", err);
    return error("Failed to get client", 500);
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Handle both camelCase and snake_case
    const salonId = body.salonId || body.salon_id;
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    const phone = body.phone;
    const email = body.email;
    const gender = body.gender;
    const dateOfBirth = body.dateOfBirth || body.date_of_birth;
    const address = body.address;
    const city = body.city;
    const postalCode = body.postalCode || body.postal_code;
    const notes = body.notes;

    // Only admin or the client themselves can update
    if (session.userId !== parseInt(id) && session.role !== "admin") {
      // Check if owner/manager updating their salon client
      if (salonId) {
        const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
          salonId,
        ]);
        if (!salon || salon.owner_id !== session.userId) {
          // Check if user is a manager
          const staff = await getOne(
            "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
            [salonId, session.userId]
          );
          if (!staff) {
            return forbidden("Not authorized to update this client");
          }
        }
      } else {
        return forbidden("Not authorized to update this client");
      }
    }

    await query(
      `UPDATE users SET 
        first_name = COALESCE(?, first_name), 
        last_name = COALESCE(?, last_name), 
        phone = COALESCE(?, phone),
        gender = COALESCE(?, gender),
        date_of_birth = COALESCE(?, date_of_birth),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        postal_code = COALESCE(?, postal_code),
        updated_at = NOW() 
      WHERE id = ?`,
      [
        firstName,
        lastName,
        phone,
        gender,
        dateOfBirth || null,
        address,
        city,
        postalCode,
        id,
      ]
    );

    // Update notes in salon_clients if salonId provided
    if (salonId && notes !== undefined) {
      await query(
        "UPDATE salon_clients SET notes = ? WHERE salon_id = ? AND client_id = ?",
        [notes || null, salonId, id]
      );
    }

    const client = await getOne(
      "SELECT id, first_name, last_name, email, phone, gender, date_of_birth, address, city, postal_code FROM users WHERE id = ?",
      [id]
    );

    // Get notes from salon_clients
    let clientNotes = null;
    if (salonId) {
      const salonClient = await getOne(
        "SELECT notes FROM salon_clients WHERE salon_id = ? AND client_id = ?",
        [salonId, id]
      );
      clientNotes = salonClient?.notes;
    }

    return success({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      gender: client.gender,
      dateOfBirth: client.date_of_birth,
      address: client.address,
      city: client.city,
      postalCode: client.postal_code,
      notes: clientNotes,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Update client error:", err);
    return error("Failed to update client", 500);
  }
}

// DELETE /api/clients/[id] - Remove client from salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    if (!salonId) {
      return error("Salon ID is required", 400);
    }

    // Check salon access
    if (session.role !== "admin") {
      const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
        salonId,
      ]);
      if (!salon || salon.owner_id !== session.userId) {
        const staff = await getOne(
          "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
          [salonId, session.userId]
        );
        if (!staff) {
          return forbidden("Not authorized to remove clients from this salon");
        }
      }
    }

    // Remove from salon_clients (doesn't delete the user, just the salon relationship)
    await query(
      "DELETE FROM salon_clients WHERE salon_id = ? AND client_id = ?",
      [salonId, id]
    );

    return success({ message: "Client removed from salon" });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete client error:", err);
    return error("Failed to remove client", 500);
  }
}
