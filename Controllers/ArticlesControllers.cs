using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebShop.Data;
using WebShop.Models;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArticlesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ArticlesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/articles
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Article>>> GetArticles()
    {
        try
        {
            return await _context.Articles.OrderByDescending(a => a.DateCreated).ToListAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error retrieving articles", details = ex.Message });
        }
    }

    // GET: api/articles/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Article>> GetArticle(int id)
    {
        try
        {
            var article = await _context.Articles.FindAsync(id);

            if (article == null)
            {
                return NotFound(new { error = "Article not found" });
            }

            return article;
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error retrieving article", details = ex.Message });
        }
    }

    // POST: api/articles
    [HttpPost]
    public async Task<ActionResult<Article>> CreateArticle(Article article)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            article.DateCreated = DateTime.UtcNow;
            _context.Articles.Add(article);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetArticle), new { id = article.Id }, article);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error creating article", details = ex.Message });
        }
    }

    // PUT: api/articles/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateArticle(int id, Article article)
    {
        if (id != article.Id)
        {
            return BadRequest(new { error = "ID mismatch" });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var existingArticle = await _context.Articles.FindAsync(id);
            if (existingArticle == null)
            {
                return NotFound(new { error = "Article not found" });
            }

            // Update properties
            existingArticle.Name = article.Name;
            existingArticle.Description = article.Description;
            existingArticle.Price = article.Price;
            existingArticle.SupplierEmail = article.SupplierEmail;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await ArticleExists(id))
            {
                return NotFound(new { error = "Article not found" });
            }
            throw;
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error updating article", details = ex.Message });
        }
    }

    // DELETE: api/articles/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteArticle(int id)
    {
        try
        {
            var article = await _context.Articles
                .Include(a => a.OrderItems)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (article == null)
            {
                return NotFound(new { error = "Article not found" });
            }

            // Check if article has been purchased
            if (article.OrderItems.Any())
            {
                return BadRequest(new 
                { 
                    error = "Cannot delete article that has been purchased",
                    message = $"This article appears in {article.OrderItems.Count} order(s). Articles that have been purchased cannot be deleted to maintain order history integrity."
                });
            }

            _context.Articles.Remove(article);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error deleting article", details = ex.Message });
        }
    }

    private async Task<bool> ArticleExists(int id)
    {
        return await _context.Articles.AnyAsync(e => e.Id == id);
    }
}