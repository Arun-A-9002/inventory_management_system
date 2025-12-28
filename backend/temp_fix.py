@router.post("/add-batch-stock")
def add_batch_stock(data: dict, db: Session = Depends(get_db)):
    """Add returned stock back to batch"""
    from models.tenant_models import GRN, GRNItem, Batch, GRNStatus
    
    item_name = data.get('item_name')
    batch_no = data.get('batch_no') 
    quantity = int(data.get('quantity', 0))
    
    # Find batch in approved GRNs
    batch = db.query(Batch).join(GRNItem).join(GRN).filter(
        GRNItem.item_name == item_name,
        Batch.batch_no == batch_no,
        GRN.status == GRNStatus.approved
    ).first()
    
    if not batch:
        raise HTTPException(404, "Batch not found")
    
    # Add ONLY the return quantity back to batch
    batch.qty += quantity
    
    db.commit()
    
    return {"message": f"Added {quantity} units back to stock", "updated_qty": batch.qty}