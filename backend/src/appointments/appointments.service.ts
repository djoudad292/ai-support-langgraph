import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';

@Injectable()
export class AppointmentsService {
  constructor(private store: StoreService) {}

  async findAll(companyId: string) {
    return this.store.findAppointmentsByCompany(companyId);
  }

  async findById(id: string) {
    return this.store.findAppointmentById(id);
  }

  async update(id: string, data: { status?: string }) {
    return this.store.updateAppointment(id, data);
  }
}