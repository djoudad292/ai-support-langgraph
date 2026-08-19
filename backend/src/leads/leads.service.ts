import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';

@Injectable()
export class LeadsService {
  constructor(private store: StoreService) {}

  async findAll(companyId: string) {
    return this.store.findLeadsByCompany(companyId);
  }

  async findById(id: string) {
    return this.store.findLeadById(id);
  }

  async update(id: string, data: { name?: string; email?: string; phone?: string; department?: string; status?: string }) {
    return this.store.updateLead(id, data);
  }
}